import {
  Injectable,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ReservationStatus,
  TicketStatus,
  BookingStatus,
  Prisma,
} from '@prisma/client';
import { ReservationItemSelection } from '@cedoi/contracts';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Atomically verifies and reserves capacity across multiple ticket categories.
   * Locks ticket types in deterministic sorted order to prevent database deadlocks.
   * Mixed-category reservations reserve all or rollback completely.
   */
  async reserveInventory(
    eventId: string,
    items: ReservationItemSelection[],
    durationMinutes: number = 10,
    txClient?: Prisma.TransactionClient
  ): Promise<{ expiresAt: Date; verifiedItems: { ticketTypeId: string; quantity: number; unitPricePaise: number }[] }> {
    if (!items || items.length === 0) {
      throw new BadRequestException({
        code: 'EMPTY_ITEMS',
        message: 'At least one ticket category must be selected.',
      });
    }

    // Sort items deterministically by ticketTypeId to avoid deadlock
    const sortedItems = [...items].sort((a, b) =>
      a.ticketTypeId.localeCompare(b.ticketTypeId)
    );

    const execute = async (tx: Prisma.TransactionClient) => {
      const now = new Date();
      const verifiedItems: {
        ticketTypeId: string;
        quantity: number;
        unitPricePaise: number;
      }[] = [];

      for (const item of sortedItems) {
        if (item.quantity <= 0) {
          throw new BadRequestException({
            code: 'INVALID_QUANTITY',
            message: 'Ticket quantity must be greater than zero.',
          });
        }

        // 1. Lock the TicketType row with FOR UPDATE using raw query
        const lockedTypes: any[] = await tx.$queryRaw`
          SELECT id, name, capacity, "maxPerBooking", "unitPricePaise", status
          FROM "TicketType"
          WHERE id = ${item.ticketTypeId} AND "eventId" = ${eventId}
          FOR UPDATE
        `;

        await tx.$executeRaw`
          UPDATE "TicketType"
          SET "updatedAt" = NOW()
          WHERE id = ${item.ticketTypeId}
        `;

        if (!lockedTypes || lockedTypes.length === 0) {
          throw new BadRequestException({
            code: 'TICKET_TYPE_NOT_FOUND',
            message: `Ticket category ${item.ticketTypeId} not found for this event.`,
          });
        }

        const ticketType = lockedTypes[0];

        if (ticketType.status !== 'ACTIVE') {
          throw new ConflictException({
            code: 'TICKET_TYPE_INACTIVE',
            message: `Ticket category "${ticketType.name}" is not currently on sale.`,
          });
        }

        if (item.quantity > ticketType.maxPerBooking) {
          throw new BadRequestException({
            code: 'EXCEEDS_MAX_PER_BOOKING',
            message: `You cannot purchase more than ${ticketType.maxPerBooking} tickets for "${ticketType.name}".`,
          });
        }

        // 2. Compute sold count
        const soldCount = await tx.ticket.count({
          where: {
            ticketTypeId: item.ticketTypeId,
            status: { in: [TicketStatus.ACTIVE, TicketStatus.USED, TicketStatus.SUSPENDED] },
          },
        });

        // 3. Compute active held count
        const heldAgg = await tx.reservationItem.aggregate({
          where: {
            ticketTypeId: item.ticketTypeId,
            reservation: {
              status: ReservationStatus.HELD,
              expiresAt: { gt: now },
            },
          },
          _sum: {
            quantity: true,
          },
        });
        const heldCount = heldAgg._sum.quantity || 0;

        const available = ticketType.capacity - (soldCount + heldCount);

        if (available < item.quantity) {
          throw new ConflictException({
            code: 'TICKET_NOT_AVAILABLE',
            message: `Only ${Math.max(0, available)} ticket(s) remaining for "${ticketType.name}". Please adjust your selection.`,
            details: {
              ticketTypeId: item.ticketTypeId,
              requested: item.quantity,
              available: Math.max(0, available),
            },
          });
        }

        verifiedItems.push({
          ticketTypeId: item.ticketTypeId,
          quantity: item.quantity,
          unitPricePaise: ticketType.unitPricePaise,
        });
      }

      const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);
      return { expiresAt, verifiedItems };
    };

    if (txClient) {
      return execute(txClient);
    } else {
      return this.prisma.$transaction(execute, {
        isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
        timeout: 10000,
      });
    }
  }

  /**
   * Sweeper to release unpurchased expired reservations.
   */
  async expireStaleReservations(): Promise<number> {
    const now = new Date();

    const result = await this.prisma.$transaction(async (tx) => {
      // Find held reservations past expiry
      const expiredList = await tx.reservation.findMany({
        where: {
          status: ReservationStatus.HELD,
          expiresAt: { lte: now },
        },
        select: {
          id: true,
          bookingId: true,
        },
        take: 100,
      });

      if (expiredList.length === 0) return 0;

      const reservationIds = expiredList.map((r) => r.id);
      const bookingIds = expiredList.map((r) => r.bookingId);

      // Update reservation status to EXPIRED
      await tx.reservation.updateMany({
        where: { id: { in: reservationIds }, status: ReservationStatus.HELD },
        data: { status: ReservationStatus.EXPIRED },
      });

      // Update booking status to EXPIRED if still PENDING
      await tx.booking.updateMany({
        where: { id: { in: bookingIds }, status: BookingStatus.PENDING },
        data: { status: BookingStatus.EXPIRED },
      });

      return expiredList.length;
    });

    if (result > 0) {
      this.logger.log(`Expired ${result} stale reservation(s).`);
    }

    return result;
  }
}
