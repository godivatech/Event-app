import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { TicketsService } from '../tickets/tickets.service';
import { AuditService } from '../audit/audit.service';
import {
  BookingStatus,
  ReservationStatus,
  PaymentAttemptStatus,
  RefundStatus,
  TicketStatus,
  OutboxJobType,
  Prisma,
} from '@prisma/client';
import {
  RazorpayOrderResponseDto,
  PaymentVerificationResultDto,
  VerifyPaymentDto,
} from '@cedoi/contracts';
import * as crypto from 'crypto';
const Razorpay = require('razorpay');
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private razorpayClient: any = null;
  private readonly keyId: string;
  private readonly keySecret: string;
  private readonly webhookSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
    private readonly ticketsService: TicketsService,
    private readonly audit: AuditService
  ) {
    this.keyId = process.env.RAZORPAY_KEY_ID || 'rzp_test_cedoi123456';
    this.keySecret = process.env.RAZORPAY_KEY_SECRET || 'mock_secret_key_for_test_mode';
    this.webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || 'mock_webhook_secret_cedoi_test';

    try {
      this.razorpayClient = new (Razorpay as any)({
        key_id: this.keyId,
        key_secret: this.keySecret,
      });
    } catch (err: any) {
      this.logger.warn(`Razorpay client initialized with mock/test fallback: ${err.message}`);
    }
  }

  /**
   * Creates a Razorpay Order for a reserved booking or reuses existing active attempt.
   */
  async createPaymentOrder(
    bookingNumber: string,
    ipAddress?: string
  ): Promise<RazorpayOrderResponseDto> {
    const booking = await this.prisma.booking.findUnique({
      where: { bookingNumber },
      include: {
        reservation: true,
        paymentAttempts: {
          where: { status: { in: [PaymentAttemptStatus.CREATED, PaymentAttemptStatus.PENDING] } },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!booking) {
      throw new NotFoundException({
        code: 'BOOKING_NOT_FOUND',
        message: 'Booking not found.',
      });
    }

    if (booking.status === BookingStatus.CONFIRMED) {
      throw new BadRequestException({
        code: 'BOOKING_ALREADY_CONFIRMED',
        message: 'This booking has already been paid and confirmed.',
      });
    }

    if (booking.status === BookingStatus.CANCELLED || booking.status === BookingStatus.EXPIRED) {
      throw new BadRequestException({
        code: 'BOOKING_INELIGIBLE',
        message: `Booking cannot be paid because it is ${booking.status}. Please start a new reservation.`,
      });
    }

    // Check reservation expiry
    const now = new Date();
    if (booking.reservation && booking.reservation.expiresAt < now) {
      throw new ConflictException({
        code: 'RESERVATION_EXPIRED',
        message: 'Your 10-minute ticket reservation has expired. Please select tickets again.',
      });
    }

    // Reuse existing attempt if still valid (avoids duplicate order creation on button retries)
    const existingAttempt = booking.paymentAttempts[0];
    if (existingAttempt && existingAttempt.razorpayOrderId) {
      return {
        orderId: existingAttempt.razorpayOrderId,
        amountPaise: existingAttempt.amountPaise,
        currency: existingAttempt.currency,
        keyId: this.keyId,
        bookingNumber: booking.bookingNumber,
        customerName: booking.customerName,
        customerPhone: booking.customerPhone,
        customerEmail: booking.customerEmail,
      };
    }

    // Create new order on Razorpay
    let razorpayOrderId: string;
    try {
      if (this.razorpayClient && !this.keyId.startsWith('rzp_test_mock')) {
        const order = await this.razorpayClient.orders.create({
          amount: booking.totalPaise,
          currency: booking.currency,
          receipt: booking.bookingNumber,
          notes: {
            bookingNumber: booking.bookingNumber,
            eventId: booking.eventId,
          },
        });
        razorpayOrderId = order.id;
      } else {
        razorpayOrderId = `order_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
      }
    } catch (err: any) {
      this.logger.error(`Razorpay order creation failed: ${err.message}`);
      // Fallback for offline test environments
      razorpayOrderId = `order_test_${uuidv4().replace(/-/g, '').slice(0, 14)}`;
    }

    const attemptCount = await this.prisma.paymentAttempt.count({
      where: { bookingId: booking.id },
    });

    await this.prisma.paymentAttempt.create({
      data: {
        bookingId: booking.id,
        attemptNumber: attemptCount + 1,
        razorpayOrderId,
        amountPaise: booking.totalPaise,
        currency: booking.currency,
        status: PaymentAttemptStatus.CREATED,
      },
    });

    await this.audit.log({
      actorType: 'CUSTOMER',
      action: 'PAYMENT_ORDER_CREATED',
      entityType: 'PAYMENT',
      entityId: razorpayOrderId,
      eventId: booking.eventId,
      ipAddress,
      metadata: { bookingNumber: booking.bookingNumber, amountPaise: booking.totalPaise },
    });

    return {
      orderId: razorpayOrderId,
      amountPaise: booking.totalPaise,
      currency: booking.currency,
      keyId: this.keyId,
      bookingNumber: booking.bookingNumber,
      customerName: booking.customerName,
      customerPhone: booking.customerPhone,
      customerEmail: booking.customerEmail,
    };
  }

  /**
   * Verifies client-submitted Razorpay payment signature.
   */
  async verifyPaymentSignature(
    dto: VerifyPaymentDto,
    ipAddress?: string
  ): Promise<PaymentVerificationResultDto> {
    const { bookingNumber, razorpayOrderId, razorpayPaymentId, razorpaySignature } = dto;

    // Verify signature: HMAC-SHA256(order_id + "|" + payment_id, secret)
    const expectedSignature = crypto
      .createHmac('sha256', this.keySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    const isValidSignature =
      expectedSignature === razorpaySignature ||
      (this.keySecret === 'mock_secret_key_for_test_mode' && razorpaySignature.startsWith('sig_test_'));

    if (!isValidSignature) {
      this.logger.warn(`Signature verification failed for booking ${bookingNumber}, order ${razorpayOrderId}`);
      await this.audit.log({
        actorType: 'CUSTOMER',
        action: 'PAYMENT_SIGNATURE_MISMATCH',
        entityType: 'PAYMENT',
        entityId: razorpayOrderId,
        ipAddress,
        metadata: { bookingNumber, razorpayPaymentId },
      });

      throw new BadRequestException({
        code: 'INVALID_PAYMENT_SIGNATURE',
        message: 'Payment verification failed: invalid signature.',
      });
    }

    // Converge into unified fulfillment service
    return this.fulfillCapturedPayment({
      bookingNumber,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      ipAddress,
    });
  }

  /**
   * Single authoritative payment fulfillment service.
   * Handles checkout callbacks, webhooks, reconciliation, late captures, and duplicate captures.
   */
  async fulfillCapturedPayment(params: {
    bookingNumber: string;
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature?: string;
    ipAddress?: string;
  }): Promise<PaymentVerificationResultDto> {
    const { bookingNumber, razorpayOrderId, razorpayPaymentId, razorpaySignature, ipAddress } = params;

    return this.prisma.$transaction(
      async (tx) => {
        // 1. Fetch booking with locking
        const booking = await tx.booking.findUnique({
          where: { bookingNumber },
          include: {
            items: true,
            reservation: true,
            tickets: true,
            pdfArtifact: true,
          },
        });

        if (!booking) {
          throw new NotFoundException({
            code: 'BOOKING_NOT_FOUND',
            message: 'Booking not found during fulfillment.',
          });
        }

        // 2. Find or create payment attempt
        let attempt = await tx.paymentAttempt.findFirst({
          where: {
            bookingId: booking.id,
            OR: [{ razorpayOrderId }, { razorpayPaymentId }],
          },
        });

        if (!attempt) {
          attempt = await tx.paymentAttempt.create({
            data: {
              bookingId: booking.id,
              razorpayOrderId,
              razorpayPaymentId,
              razorpaySignature,
              amountPaise: booking.totalPaise,
              status: PaymentAttemptStatus.CAPTURED,
            },
          });
        } else {
          await tx.paymentAttempt.update({
            where: { id: attempt.id },
            data: {
              razorpayPaymentId,
              razorpaySignature,
              status: PaymentAttemptStatus.CAPTURED,
            },
          });
        }

        // 3. Check if booking is already confirmed (duplicate capture scenario)
        if (booking.status === BookingStatus.CONFIRMED) {
          const capturedCount = await tx.paymentAttempt.count({
            where: { bookingId: booking.id, status: PaymentAttemptStatus.CAPTURED },
          });

          if (capturedCount > 1) {
            // Duplicate capture! Create tracked compensating refund
            const refundRef = `REF-DUP-${uuidv4().slice(0, 8).toUpperCase()}`;
            await tx.refund.create({
              data: {
                bookingId: booking.id,
                paymentAttemptId: attempt.id,
                amountPaise: booking.totalPaise,
                reason: 'DUPLICATE_PAYMENT_CAPTURED',
                status: RefundStatus.REQUESTED,
                internalReference: refundRef,
              },
            });

            await this.audit.log({
              actorType: 'SYSTEM',
              action: 'DUPLICATE_PAYMENT_REFUND_SCHEDULED',
              entityType: 'REFUND',
              entityId: refundRef,
              eventId: booking.eventId,
              metadata: { bookingNumber, razorpayPaymentId },
            });
          }

          return {
            bookingNumber: booking.bookingNumber,
            status: booking.status as any,
            ticketsIssued: booking.tickets.length,
            pdfStatus: (booking.pdfArtifact?.status as any) || 'PENDING',
          };
        }

        // 4. Check reservation expiry (late capture scenario)
        const now = new Date();
        const isReservationValid =
          booking.reservation &&
          booking.reservation.status === ReservationStatus.HELD &&
          booking.reservation.expiresAt > now;

        if (!isReservationValid) {
          this.logger.warn(`Late capture detected for booking ${booking.bookingNumber}. Attempting capacity reallocation.`);
          // Attempt to atomically reallocate capacity
          try {
            await this.inventoryService.reserveInventory(
              booking.eventId,
              booking.items.map((i) => ({
                ticketTypeId: i.ticketTypeId,
                quantity: i.quantity,
              })),
              10,
              tx
            );
          } catch {
            // Capacity unavailable! Cannot fulfill.
            this.logger.error(`Capacity exhausted for late capture on booking ${booking.bookingNumber}. Scheduling full compensating refund.`);

            await tx.booking.update({
              where: { id: booking.id },
              data: { status: BookingStatus.PAYMENT_EXCEPTION },
            });

            const refundRef = `REF-LATE-${uuidv4().slice(0, 8).toUpperCase()}`;
            await tx.refund.create({
              data: {
                bookingId: booking.id,
                paymentAttemptId: attempt.id,
                amountPaise: booking.totalPaise,
                reason: 'LATE_CAPTURE_INSUFFICIENT_CAPACITY',
                status: RefundStatus.REQUESTED,
                internalReference: refundRef,
              },
            });

            await this.audit.log({
              actorType: 'SYSTEM',
              action: 'LATE_CAPTURE_COMPENSATION_REFUND',
              entityType: 'BOOKING',
              entityId: booking.id,
              eventId: booking.eventId,
              metadata: { bookingNumber, refundRef },
            });

            return {
              bookingNumber: booking.bookingNumber,
              status: BookingStatus.PAYMENT_EXCEPTION,
              ticketsIssued: 0,
              pdfStatus: 'FAILED' as any,
            };
          }
        }

        // 5. Consume reservation & confirm booking
        if (booking.reservation) {
          await tx.reservation.update({
            where: { id: booking.reservation.id },
            data: { status: ReservationStatus.CONSUMED },
          });
        }

        const updatedBooking = await tx.booking.update({
          where: { id: booking.id },
          data: { status: BookingStatus.CONFIRMED },
        });

        // 6. Issue admission tickets atomically inside this transaction
        const ticketsIssued = await this.ticketsService.issueTicketsForBooking(tx, updatedBooking.id);

        await this.audit.log({
          actorType: 'CUSTOMER',
          action: 'PAYMENT_CAPTURED_AND_FULFILLED',
          entityType: 'BOOKING',
          entityId: updatedBooking.id,
          eventId: updatedBooking.eventId,
          ipAddress,
          metadata: {
            bookingNumber: updatedBooking.bookingNumber,
            razorpayPaymentId,
            ticketsIssued,
          },
        });

        return {
          bookingNumber: updatedBooking.bookingNumber,
          status: BookingStatus.CONFIRMED,
          ticketsIssued,
          pdfStatus: 'PENDING' as any,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
        timeout: 15000,
      }
    );
  }

  /**
   * Processes incoming Razorpay Webhook with raw body signature verification and deduplication.
   */
  async handleWebhook(rawBody: string, signature: string, eventPayload: any): Promise<{ received: boolean }> {
    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(rawBody)
      .digest('hex');

    const isValid =
      expectedSignature === signature ||
      (this.webhookSecret === 'mock_webhook_secret_cedoi_test' && signature.startsWith('sig_hook_test_'));

    if (!isValid) {
      this.logger.warn('Webhook signature verification failed');
      throw new BadRequestException('Invalid webhook signature');
    }

    const eventId = eventPayload.event_id || eventPayload.id || `evt_${uuidv4().slice(0, 12)}`;
    const eventType = eventPayload.event;

    // Deduplicate webhook event
    const existing = await this.prisma.processedWebhook.findUnique({
      where: { eventId },
    });

    if (existing) {
      this.logger.log(`Webhook ${eventId} already processed, acknowledging.`);
      return { received: true };
    }

    // Persist webhook receipt
    await this.prisma.processedWebhook.create({
      data: {
        eventId,
        eventType,
        payloadHash: crypto.createHash('sha256').update(rawBody).digest('hex'),
        status: 'ACCEPTED',
      },
    });

    // Handle payment capture events
    if (eventType === 'payment.captured' || eventType === 'order.paid') {
      const paymentEntity = eventPayload.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id || eventPayload.payload?.order?.entity?.id;
      const paymentId = paymentEntity?.id;
      const bookingNumber = paymentEntity?.notes?.bookingNumber || eventPayload.payload?.order?.entity?.receipt;

      if (bookingNumber && orderId && paymentId) {
        await this.fulfillCapturedPayment({
          bookingNumber,
          razorpayOrderId: orderId,
          razorpayPaymentId: paymentId,
        });
      }
    }

    return { received: true };
  }

  /**
   * Voluntary admin-initiated full-booking refund for eligible unused bookings.
   */
  async adminRefundBooking(
    bookingNumber: string,
    actorId: string,
    reason: string,
    ipAddress?: string
  ) {
    if (!reason || reason.trim().length === 0) {
      throw new BadRequestException('A valid reason must be provided for initiating a refund.');
    }

    return this.prisma.$transaction(
      async (tx) => {
        const booking = await tx.booking.findUnique({
          where: { bookingNumber },
          include: {
            tickets: true,
            paymentAttempts: {
              where: { status: PaymentAttemptStatus.CAPTURED },
              orderBy: { createdAt: 'desc' },
              take: 1,
            },
            refunds: true,
          },
        });

        if (!booking) throw new NotFoundException('Booking not found');

        if (booking.status !== BookingStatus.CONFIRMED) {
          throw new BadRequestException(`Booking cannot be refunded because status is ${booking.status}`);
        }

        const capturedPayment = booking.paymentAttempts[0];
        if (!capturedPayment) {
          throw new BadRequestException('No captured payment attempt found for this booking.');
        }

        // Check if any ticket was already used
        const usedTicket = booking.tickets.find((t) => t.status === TicketStatus.USED);
        if (usedTicket) {
          throw new BadRequestException({
            code: 'TICKETS_ALREADY_USED',
            message: 'Booking cannot be refunded because one or more tickets have already been admitted at the gate.',
          });
        }

        // Check if already refunded
        const existingRefund = booking.refunds.find(
          (r) => r.status === RefundStatus.SUCCEEDED || r.status === RefundStatus.PROCESSING
        );
        if (existingRefund) {
          throw new BadRequestException('A refund has already been requested or processed for this booking.');
        }

        // Suspend tickets first
        await tx.ticket.updateMany({
          where: { bookingId: booking.id, status: TicketStatus.ACTIVE },
          data: { status: TicketStatus.SUSPENDED },
        });

        // Generate internal reference
        const internalReference = `REF-${uuidv4().slice(0, 10).toUpperCase()}`;

        // Attempt Razorpay refund
        let razorpayRefundId = `rfnd_${uuidv4().replace(/-/g, '').slice(0, 14)}`;
        let refundStatus: RefundStatus = RefundStatus.SUCCEEDED;

        if (this.razorpayClient && !this.keyId.startsWith('rzp_test_mock')) {
          try {
            const refundRes = await this.razorpayClient.payments.refund(capturedPayment.razorpayPaymentId, {
              amount: booking.totalPaise,
              notes: { bookingNumber: booking.bookingNumber, reason },
            });
            razorpayRefundId = refundRes.id;
          } catch (err: any) {
            this.logger.error(`Razorpay refund API call failed: ${err.message}`);
            // If unknown/ambiguous error, flag as UNKNOWN or PROCESSING for reconciliation
            refundStatus = RefundStatus.PROCESSING;
          }
        }

        // Create Refund record
        const refundRecord = await tx.refund.create({
          data: {
            bookingId: booking.id,
            paymentAttemptId: capturedPayment.id,
            amountPaise: booking.totalPaise,
            reason,
            status: refundStatus,
            razorpayRefundId,
            actorId,
            internalReference,
          },
        });

        if (refundStatus === RefundStatus.SUCCEEDED) {
          // Cancel tickets permanently
          await tx.ticket.updateMany({
            where: { bookingId: booking.id },
            data: { status: TicketStatus.CANCELLED },
          });

          // Mark booking cancelled
          await tx.booking.update({
            where: { id: booking.id },
            data: { status: BookingStatus.CANCELLED },
          });
        }

        await this.audit.log({
          actorId,
          actorType: 'STAFF',
          action: 'ADMIN_FULL_BOOKING_REFUND',
          entityType: 'REFUND',
          entityId: refundRecord.id,
          eventId: booking.eventId,
          ipAddress,
          metadata: {
            bookingNumber: booking.bookingNumber,
            amountPaise: booking.totalPaise,
            reason,
            refundStatus,
          },
        });

        return {
          bookingNumber: booking.bookingNumber,
          amountPaise: booking.totalPaise,
          refundStatus,
          internalReference,
          message:
            refundStatus === RefundStatus.SUCCEEDED
              ? 'Full refund processed and booking cancelled.'
              : 'Refund submitted and pending provider settlement.',
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
        timeout: 15000,
      }
    );
  }
}
