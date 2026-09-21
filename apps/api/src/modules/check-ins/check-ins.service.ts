import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CryptoUtil } from '../../common/crypto/crypto.util';
import {
  CheckInResult,
  TicketStatus,
  EventStatus,
  Prisma,
} from '@prisma/client';
import {
  CheckInRequestDto,
  CheckInResponseDto,
} from '@cedoi/contracts';

@Injectable()
export class CheckInsService {
  private readonly logger = new Logger(CheckInsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  /**
   * Atomic check-in operation with request-level idempotency and race condition protection.
   */
  async checkIn(
    dto: CheckInRequestDto,
    staffUserId: string,
    ipAddress?: string
  ): Promise<CheckInResponseDto> {
    const { eventId, gateId, qrCredential, ticketNumber, requestId } = dto;

    if (!requestId) {
      throw new ForbiddenException({
        code: 'REQUEST_ID_REQUIRED',
        message: 'A client requestId UUID is required for idempotent check-in.',
      });
    }

    // 1. Check if this exact requestId was already processed (network retry / duplicate request)
    const existingCheckIn = await this.prisma.checkIn.findUnique({
      where: { requestId },
      include: {
        ticket: {
          include: {
            ticketType: true,
            booking: true,
          },
        },
        gate: true,
      },
    });

    if (existingCheckIn) {
      return {
        result: existingCheckIn.result as any,
        message:
          existingCheckIn.result === CheckInResult.SUCCESS
            ? 'Entry Allowed (Original Request Result)'
            : `Scan Result: ${existingCheckIn.result}`,
        isDuplicateRequest: true,
        ticket: {
          ticketNumber: existingCheckIn.ticket.ticketNumber,
          ticketTypeName: existingCheckIn.ticket.ticketType.name,
          customerName: existingCheckIn.ticket.booking.customerName,
          attendeeName: existingCheckIn.ticket.attendeeName || existingCheckIn.ticket.booking.customerName,
          businessName: existingCheckIn.ticket.businessName || existingCheckIn.ticket.booking.businessName,
          location: existingCheckIn.ticket.location || existingCheckIn.ticket.booking.location,
          memberType: (existingCheckIn.ticket.memberType || existingCheckIn.ticket.booking.memberType) as any,
          foodPreference: (existingCheckIn.ticket.foodPreference || existingCheckIn.ticket.booking.foodPreference) as any,
          status: existingCheckIn.ticket.status as any,
          admissionIndex: existingCheckIn.ticket.admissionIndex,
        },
        admittedAt: existingCheckIn.checkedInAt.toISOString(),
        admittedGate: existingCheckIn.gate?.name || 'Assigned Gate',
      };
    }

    // 2. Locate the ticket by QR hash or ticket number
    let qrHash: string | undefined;
    if (qrCredential) {
      qrHash = CryptoUtil.sha256(qrCredential.trim());
    }

    const ticket = await this.prisma.ticket.findFirst({
      where: {
        OR: [
          ...(qrHash ? [{ qrCredentialHash: qrHash }] : []),
          ...(ticketNumber
            ? [{ ticketNumber: { equals: ticketNumber.trim(), mode: 'insensitive' as const } }]
            : []),
        ],
      },
      include: {
        booking: {
          include: {
            event: true,
          },
        },
        ticketType: true,
      },
    });

    if (!ticket) {
      return {
        result: CheckInResult.INVALID as any,
        message: 'Unrecognized ticket or invalid QR code.',
        isDuplicateRequest: false,
      };
    }

    // 3. Validate event match
    if (ticket.booking.eventId !== eventId) {
      return {
        result: CheckInResult.WRONG_EVENT as any,
        message: `This ticket is for a different event (${ticket.booking.event.name}).`,
        isDuplicateRequest: false,
        ticket: {
          ticketNumber: ticket.ticketNumber,
          ticketTypeName: ticket.ticketType.name,
          customerName: ticket.booking.customerName,
          attendeeName: ticket.attendeeName || ticket.booking.customerName,
          businessName: ticket.businessName || ticket.booking.businessName,
          location: ticket.location || ticket.booking.location,
          memberType: (ticket.memberType || ticket.booking.memberType) as any,
          foodPreference: (ticket.foodPreference || ticket.booking.foodPreference) as any,
          status: ticket.status as any,
          admissionIndex: ticket.admissionIndex,
        },
      };
    }

    // 4. Validate event status & entry window
    if (ticket.booking.event.status === EventStatus.CANCELLED) {
      return {
        result: CheckInResult.CANCELLED as any,
        message: 'Event has been cancelled. Admissions are closed.',
        isDuplicateRequest: false,
      };
    }

    // Check entry time window: allow entry from 4 hours before startsAt until endsAt
    const now = new Date();
    const windowStart = new Date(ticket.booking.event.startsAt.getTime() - 4 * 60 * 60 * 1000);
    const windowEnd = new Date(ticket.booking.event.endsAt.getTime() + 2 * 60 * 60 * 1000);

    if (now < windowStart || now > windowEnd) {
      return {
        result: CheckInResult.OUTSIDE_WINDOW as any,
        message: 'Current time is outside the admission window for this event.',
        isDuplicateRequest: false,
        ticket: {
          ticketNumber: ticket.ticketNumber,
          ticketTypeName: ticket.ticketType.name,
          customerName: ticket.booking.customerName,
          status: ticket.status as any,
          admissionIndex: ticket.admissionIndex,
        },
      };
    }

    // 5. Atomic check-in transaction in PostgreSQL
    return this.prisma.$transaction(
      async (tx) => {
        // Atomic conditional update: ONLY transitions if current status is ACTIVE
        const updateResult = await tx.ticket.updateMany({
          where: {
            id: ticket.id,
            status: TicketStatus.ACTIVE,
          },
          data: {
            status: TicketStatus.USED,
          },
        });

        if (updateResult.count === 0) {
          // Status was not ACTIVE! Find out why.
          const freshTicket = await tx.ticket.findUnique({
            where: { id: ticket.id },
            include: {
              checkIns: {
                where: { result: CheckInResult.SUCCESS },
                orderBy: { checkedInAt: 'asc' },
                include: { gate: true },
                take: 1,
              },
            },
          });

          if (freshTicket?.status === TicketStatus.USED) {
            const firstCheckIn = freshTicket.checkIns[0];
            return {
              result: CheckInResult.ALREADY_USED as any,
              message: 'This ticket has already been used for entry.',
              isDuplicateRequest: false,
              ticket: {
                ticketNumber: ticket.ticketNumber,
                ticketTypeName: ticket.ticketType.name,
                customerName: ticket.booking.customerName,
                status: TicketStatus.USED as any,
                admissionIndex: ticket.admissionIndex,
              },
              firstAdmittedAt: firstCheckIn?.checkedInAt.toISOString(),
              firstAdmittedGate: firstCheckIn?.gate?.name || 'Gate',
            };
          }

          return {
            result: CheckInResult.CANCELLED as any,
            message: `Ticket cannot be admitted because status is ${freshTicket?.status}.`,
            isDuplicateRequest: false,
            ticket: {
              ticketNumber: ticket.ticketNumber,
              ticketTypeName: ticket.ticketType.name,
              customerName: ticket.booking.customerName,
              status: (freshTicket?.status as any) || TicketStatus.CANCELLED,
              admissionIndex: ticket.admissionIndex,
            },
          };
        }

        // Admission successful! Record CheckIn row
        const checkIn = await tx.checkIn.create({
          data: {
            ticketId: ticket.id,
            eventId: ticket.booking.eventId,
            gateId: gateId || null,
            staffUserId,
            requestId,
            result: CheckInResult.SUCCESS,
            notes: 'Mobile scanner admission',
          },
          include: { gate: true },
        });

        await this.audit.log({
          actorId: staffUserId,
          actorType: 'SCANNER',
          action: 'TICKET_CHECK_IN_SUCCESS',
          entityType: 'TICKET',
          entityId: ticket.id,
          eventId: ticket.booking.eventId,
          requestId,
          ipAddress,
          metadata: {
            ticketNumber: ticket.ticketNumber,
            gateId,
          },
        });

        return {
          result: CheckInResult.SUCCESS as any,
          message: 'Entry Allowed',
          isDuplicateRequest: false,
          ticket: {
            ticketNumber: ticket.ticketNumber,
            ticketTypeName: ticket.ticketType.name,
            customerName: ticket.booking.customerName,
            attendeeName: ticket.attendeeName || ticket.booking.customerName,
            businessName: ticket.businessName || ticket.booking.businessName,
            location: ticket.location || ticket.booking.location,
            memberType: (ticket.memberType || ticket.booking.memberType) as any,
            foodPreference: (ticket.foodPreference || ticket.booking.foodPreference) as any,
            status: TicketStatus.USED as any,
            admissionIndex: ticket.admissionIndex,
          },
          admittedAt: checkIn.checkedInAt.toISOString(),
          admittedGate: checkIn.gate?.name || 'Assigned Gate',
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
        timeout: 10000,
      }
    );
  }

  /**
   * Retrieves recent check-in history for the active scanner staff.
   */
  async getScannerHistory(staffUserId: string, eventId?: string, limit: number = 50) {
    return this.prisma.checkIn.findMany({
      where: {
        staffUserId,
        ...(eventId ? { eventId } : {}),
      },
      include: {
        ticket: {
          include: {
            ticketType: true,
          },
        },
        gate: true,
      },
      orderBy: { checkedInAt: 'desc' },
      take: limit,
    });
  }
}
