import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { AuditService } from '../audit/audit.service';
import { CryptoUtil } from '../../common/crypto/crypto.util';
import {
  CreateReservationDto,
  ReservationResponseDto,
  BookingDetailDto,
  BookingStatus,
  EventStatus,
} from '@cedoi/contracts';
import { Prisma } from '@prisma/client';

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);
  // Rate limiting map for recovery code brute-force protection
  private recoveryAttempts = new Map<string, { count: number; lockedUntil: number }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
    private readonly audit: AuditService
  ) {}

  async createReservation(
    dto: CreateReservationDto,
    guestToken?: string,
    ipAddress?: string
  ): Promise<ReservationResponseDto> {
    if (!dto.customerName || !dto.customerPhone) {
      throw new BadRequestException({
        code: 'MISSING_CUSTOMER_INFO',
        message: 'Customer name and mobile number are required.',
      });
    }

    const event = await this.prisma.event.findUnique({
      where: { id: dto.eventId },
    });

    if (!event || event.status !== EventStatus.PUBLISHED) {
      throw new BadRequestException({
        code: 'EVENT_NOT_AVAILABLE',
        message: 'This event is not published or currently accepting bookings.',
      });
    }

    if (new Date() > event.endsAt) {
      throw new BadRequestException({
        code: 'EVENT_ENDED',
        message: 'This event has already ended.',
      });
    }

    // Clean inputs
    const normalizedPhone = dto.customerPhone.trim();
    const customerName = dto.customerName.trim();
    const customerEmail = dto.customerEmail?.trim() || null;
    const businessName = dto.businessName?.trim() || null;
    const location = dto.location?.trim() || null;
    const memberType = dto.memberType === 'MEMBER' ? 'MEMBER' : 'NON_MEMBER';
    const foodPreference = dto.foodPreference === 'NON_VEG' ? 'NON_VEG' : 'VEG';

    // Age requirement validation (Strictly 18+)
    if (dto.age === undefined || dto.age === null || String(dto.age).trim() === '') {
      throw new BadRequestException({
        code: 'MISSING_AGE',
        message: 'Age is required. Admission is strictly restricted to delegates aged 18 and above.',
      });
    }

    const age = Number(dto.age);
    if (isNaN(age) || age < 18) {
      throw new BadRequestException({
        code: 'AGE_RESTRICTION_FAILED',
        message: 'Admission is strictly restricted to delegates aged 18 and above.',
      });
    }

    // Generate readable booking number and strong recovery code
    const bookingNumber = CryptoUtil.generateBookingNumber();
    const rawRecoveryCode = CryptoUtil.generateRecoveryCode();
    const recoveryCodeHash = CryptoUtil.sha256(rawRecoveryCode);
    const guestTokenHash = guestToken ? CryptoUtil.sha256(guestToken) : null;

    // Execute atomic reservation + booking creation in transaction
    const booking = await this.prisma.$transaction(
      async (tx) => {
        // 1. Reserve inventory with row-locking
        const { expiresAt, verifiedItems } =
          await this.inventoryService.reserveInventory(
            event.id,
            dto.items,
            10, // 10 minutes hold
            tx
          );

        // 2. Calculate totals in integer paise
        let totalPaise = 0;
        for (const item of verifiedItems) {
          totalPaise += item.unitPricePaise * item.quantity;
        }

        // 3. Create Booking
        const createdBooking = await tx.booking.create({
          data: {
            bookingNumber,
            eventId: event.id,
            customerName,
            customerPhone: normalizedPhone,
            customerEmail,
            businessName,
            location,
            age,
            memberType,
            foodPreference,
            currency: 'INR',
            subtotalPaise: totalPaise,
            totalPaise,
            status: BookingStatus.PENDING,
            reservationExpiresAt: expiresAt,
            recoveryCodeHash,
            guestSessionTokenHash: guestTokenHash,
            items: {
              create: verifiedItems.map((item) => ({
                ticketTypeId: item.ticketTypeId,
                quantity: item.quantity,
                unitPricePaise: item.unitPricePaise,
                lineTotalPaise: item.unitPricePaise * item.quantity,
              })),
            },
            reservation: {
              create: {
                expiresAt,
                items: {
                  create: verifiedItems.map((item) => ({
                    ticketTypeId: item.ticketTypeId,
                    quantity: item.quantity,
                  })),
                },
              },
            },
          },
          include: {
            items: {
              include: {
                ticketType: true,
              },
            },
            reservation: true,
          },
        });

        // 4. Create initial TicketAccessSession for current device
        if (guestTokenHash) {
          await tx.ticketAccessSession.upsert({
            where: {
              bookingId_tokenHash: {
                bookingId: createdBooking.id,
                tokenHash: guestTokenHash,
              },
            },
            update: {
              expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
              ipAddress,
            },
            create: {
              bookingId: createdBooking.id,
              tokenHash: guestTokenHash,
              expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
              ipAddress,
            },
          });
        }

        return createdBooking;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
        timeout: 10000,
      }
    );

    await this.audit.log({
      actorType: 'CUSTOMER',
      action: 'BOOKING_RESERVATION_CREATED',
      entityType: 'BOOKING',
      entityId: booking.id,
      eventId: event.id,
      ipAddress,
      metadata: {
        bookingNumber: booking.bookingNumber,
        totalPaise: booking.totalPaise,
        itemCount: booking.items.length,
      },
    });

    return {
      bookingId: booking.id,
      bookingNumber: booking.bookingNumber,
      reservationId: booking.reservation?.id || '',
      expiresAt: booking.reservationExpiresAt!.toISOString(),
      totalPaise: booking.totalPaise,
      currency: booking.currency,
      recoveryCode: rawRecoveryCode, // Exclusively returned once here
      items: booking.items.map((it) => ({
        ticketTypeId: it.ticketTypeId,
        ticketTypeName: it.ticketType.name,
        quantity: it.quantity,
        unitPricePaise: it.unitPricePaise,
        lineTotalPaise: it.lineTotalPaise,
      })),
    };
  }

  async getBookingByNumber(
    bookingNumber: string,
    guestToken?: string,
    staffUser?: any
  ): Promise<BookingDetailDto> {
    const booking = await this.prisma.booking.findUnique({
      where: { bookingNumber },
      include: {
        event: true,
        items: {
          include: {
            ticketType: true,
          },
        },
        paymentAttempts: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        tickets: {
          include: {
            ticketType: true,
          },
          orderBy: { admissionIndex: 'asc' },
        },
        pdfArtifact: true,
        accessSessions: true,
      },
    });

    if (!booking) {
      throw new NotFoundException({
        code: 'BOOKING_NOT_FOUND',
        message: `Booking ${bookingNumber} not found.`,
      });
    }

    // Check authorization: staff OR matching guest session
    let authorized = false;
    if (staffUser && (staffUser.role === 'ADMIN' || staffUser.role === 'SUPER_ADMIN')) {
      authorized = true;
    } else if (guestToken) {
      const guestTokenHash = CryptoUtil.sha256(guestToken);
      if (
        booking.guestSessionTokenHash === guestTokenHash ||
        booking.accessSessions.some((s) => s.tokenHash === guestTokenHash && s.expiresAt > new Date())
      ) {
        authorized = true;
      }
    }

    if (!authorized) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED_BOOKING_ACCESS',
        message: 'You do not have permission to view this booking. Please use your recovery code.',
      });
    }

    const latestPayment = booking.paymentAttempts[0] || null;

    return {
      id: booking.id,
      bookingNumber: booking.bookingNumber,
      eventId: booking.eventId,
      eventName: booking.event.name,
      eventVenue: booking.event.venue,
      eventStartsAt: booking.event.startsAt.toISOString(),
      eventEndsAt: booking.event.endsAt.toISOString(),
      eventTimezone: booking.event.timezone,
      customerName: booking.customerName,
      customerPhone: booking.customerPhone,
      customerEmail: booking.customerEmail,
      businessName: booking.businessName,
      location: booking.location,
      age: booking.age ?? null,
      memberType: booking.memberType as any,
      foodPreference: booking.foodPreference as any,
      currency: booking.currency,
      subtotalPaise: booking.subtotalPaise,
      totalPaise: booking.totalPaise,
      status: booking.status as any,
      reservationExpiresAt: booking.reservationExpiresAt?.toISOString() || null,
      createdAt: booking.createdAt.toISOString(),
      items: booking.items.map((it) => ({
        id: it.id,
        ticketTypeId: it.ticketTypeId,
        ticketTypeName: it.ticketType.name,
        quantity: it.quantity,
        unitPricePaise: it.unitPricePaise,
        lineTotalPaise: it.lineTotalPaise,
      })),
      paymentAttempt: latestPayment
        ? {
            id: latestPayment.id,
            razorpayOrderId: latestPayment.razorpayOrderId,
            status: latestPayment.status as any,
            amountPaise: latestPayment.amountPaise,
          }
        : null,
      tickets: booking.tickets.map((t) => ({
        id: t.id,
        ticketNumber: t.ticketNumber,
        ticketTypeName: t.ticketType.name,
        admissionIndex: t.admissionIndex,
        status: t.status as any,
        attendeeName: t.attendeeName || booking.customerName,
        businessName: t.businessName || booking.businessName,
        location: t.location || booking.location,
        memberType: (t.memberType || booking.memberType) as any,
        foodPreference: (t.foodPreference || booking.foodPreference) as any,
        qrData: t.qrCredentialHash, // Safe hashed identifier for web QR display
      })),
      pdfArtifact: booking.pdfArtifact
        ? {
            status: booking.pdfArtifact.status as any,
            downloadUrl: `/api/v1/tickets/${booking.bookingNumber}/pdf`,
          }
        : null,
    };
  }

  async recoverBookingByCode(
    bookingNumber: string,
    recoveryCode: string,
    guestToken?: string,
    ipAddress?: string
  ): Promise<BookingDetailDto> {
    const rateLimitKey = `${ipAddress}_${bookingNumber.toUpperCase()}`;
    const now = Date.now();
    const rateLimit = this.recoveryAttempts.get(rateLimitKey);

    if (rateLimit && rateLimit.lockedUntil > now) {
      const waitSeconds = Math.ceil((rateLimit.lockedUntil - now) / 1000);
      throw new ForbiddenException({
        code: 'RECOVERY_RATE_LIMITED',
        message: `Too many attempts. Please try again in ${waitSeconds} seconds.`,
      });
    }

    const booking = await this.prisma.booking.findUnique({
      where: { bookingNumber: bookingNumber.trim().toUpperCase() },
      include: {
        event: true,
        items: { include: { ticketType: true } },
        paymentAttempts: { orderBy: { createdAt: 'desc' }, take: 1 },
        tickets: { include: { ticketType: true } },
        pdfArtifact: true,
      },
    });

    const normalizedCode = recoveryCode.trim().toUpperCase();
    const inputHash = CryptoUtil.sha256(normalizedCode);

    if (!booking || booking.recoveryCodeHash !== inputHash) {
      // Record failed attempt
      const attempts = (rateLimit?.count || 0) + 1;
      const lockedUntil = attempts >= 5 ? now + 15 * 60 * 1000 : 0; // 15 min lock after 5 fails
      this.recoveryAttempts.set(rateLimitKey, { count: attempts, lockedUntil });

      this.logger.warn(`Failed recovery attempt for booking: ${bookingNumber} from IP: ${ipAddress}`);
      throw new UnauthorizedException({
        code: 'INVALID_RECOVERY_CREDENTIALS',
        message: 'Invalid booking number or recovery code. Please check your credentials.',
      });
    }

    // Reset rate limiter on successful match
    this.recoveryAttempts.delete(rateLimitKey);

    // Link current guest token to this booking
    if (guestToken) {
      const guestTokenHash = CryptoUtil.sha256(guestToken);
      await this.prisma.ticketAccessSession.upsert({
        where: {
          bookingId_tokenHash: {
            bookingId: booking.id,
            tokenHash: guestTokenHash,
          },
        },
        update: {
          expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          ipAddress,
        },
        create: {
          bookingId: booking.id,
          tokenHash: guestTokenHash,
          expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          ipAddress,
        },
      });
    }

    await this.audit.log({
      actorType: 'CUSTOMER',
      action: 'BOOKING_RECOVERED_BY_CODE',
      entityType: 'BOOKING',
      entityId: booking.id,
      eventId: booking.eventId,
      ipAddress,
    });

    return this.getBookingByNumber(booking.bookingNumber, guestToken);
  }

  async staffAssistedRecovery(
    bookingNumber: string,
    staffUserId: string,
    reason: string,
    ipAddress?: string
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { bookingNumber },
    });

    if (!booking) {
      throw new NotFoundException({
        code: 'BOOKING_NOT_FOUND',
        message: 'Booking not found.',
      });
    }

    // Generate new recovery code
    const newRawRecoveryCode = CryptoUtil.generateRecoveryCode();
    const newRecoveryCodeHash = CryptoUtil.sha256(newRawRecoveryCode);

    await this.prisma.booking.update({
      where: { id: booking.id },
      data: { recoveryCodeHash: newRecoveryCodeHash },
    });

    await this.audit.log({
      actorId: staffUserId,
      actorType: 'STAFF',
      action: 'STAFF_ASSISTED_RECOVERY',
      entityType: 'BOOKING',
      entityId: booking.id,
      eventId: booking.eventId,
      ipAddress,
      metadata: { reason },
    });

    return {
      bookingNumber: booking.bookingNumber,
      newRecoveryCode: newRawRecoveryCode,
      message: 'New recovery code successfully generated and issued by staff.',
    };
  }
}
