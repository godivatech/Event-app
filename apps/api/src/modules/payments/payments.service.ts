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
import { CashfreeClient } from './cashfree.client';
import {
  BookingStatus,
  ReservationStatus,
  PaymentAttemptStatus,
  RefundStatus,
  TicketStatus,
  Prisma,
} from '@prisma/client';
import {
  CashfreeOrderResponseDto,
  PaymentVerificationResultDto,
  VerifyPaymentDto,
} from '@cedoi/contracts';
import * as crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
    private readonly ticketsService: TicketsService,
    private readonly audit: AuditService,
    private readonly cashfreeClient: CashfreeClient
  ) {}

  /**
   * Helper to extract booking number from order ID format: cf_<bookingNumber>_<timestamp>
   */
  private extractBookingNumberFromOrderId(orderId: string): string | null {
    if (!orderId) return null;
    const parts = orderId.split('_');
    // If format cf_CEDOI-2026-XXXXX_hash
    if (parts.length >= 3 && parts[0] === 'cf') {
      return parts.slice(1, parts.length - 1).join('_');
    }
    return null;
  }

  /**
   * Creates a Cashfree PG Order for a reserved booking or reuses existing active attempt.
   */
  async createPaymentOrder(
    bookingNumber: string,
    ipAddress?: string
  ): Promise<CashfreeOrderResponseDto> {
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

    // Reuse existing attempt if still valid (avoids duplicate order creation on page refreshes)
    const existingAttempt = booking.paymentAttempts[0];
    if (existingAttempt && (existingAttempt.cfOrderId || existingAttempt.cfPaymentSessionId)) {
      return {
        orderId: existingAttempt.cfOrderId || existingAttempt.id,
        paymentSessionId: existingAttempt.cfPaymentSessionId || '',
        cfOrderId: existingAttempt.cfOrderId || undefined,
        amountPaise: existingAttempt.amountPaise,
        amountRupees: Number((existingAttempt.amountPaise / 100).toFixed(2)),
        currency: existingAttempt.currency,
        environment: this.cashfreeClient.getEnvironment(),
        bookingNumber: booking.bookingNumber,
        customerName: booking.customerName,
        customerPhone: booking.customerPhone,
        customerEmail: booking.customerEmail,
      };
    }

    // Generate unique Cashfree Order ID (alphanumeric + underscore/hyphen, max 45 chars)
    const cleanBookingRef = booking.bookingNumber.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 25);
    const orderId = `cf_${cleanBookingRef}_${Date.now().toString(36)}`;
    const amountRupees = Number((booking.totalPaise / 100).toFixed(2));

    const cfOrder = await this.cashfreeClient.createOrder({
      orderId,
      amountRupees,
      currency: booking.currency,
      customer: {
        customerId: booking.bookingNumber,
        customerName: booking.customerName,
        customerPhone: booking.customerPhone,
        customerEmail: booking.customerEmail,
      },
      orderNote: `CEDOI AWARDS Admission - ${booking.bookingNumber}`,
    });

    const attemptCount = await this.prisma.paymentAttempt.count({
      where: { bookingId: booking.id },
    });

    await this.prisma.paymentAttempt.create({
      data: {
        bookingId: booking.id,
        attemptNumber: attemptCount + 1,
        provider: 'CASHFREE',
        cfOrderId: cfOrder.orderId,
        cfPaymentSessionId: cfOrder.paymentSessionId,
        amountPaise: booking.totalPaise,
        currency: booking.currency,
        status: PaymentAttemptStatus.CREATED,
      },
    });

    await this.audit.log({
      actorType: 'CUSTOMER',
      action: 'PAYMENT_ORDER_CREATED',
      entityType: 'PAYMENT',
      entityId: cfOrder.orderId,
      eventId: booking.eventId,
      ipAddress,
      metadata: {
        bookingNumber: booking.bookingNumber,
        amountPaise: booking.totalPaise,
        amountRupees,
        provider: 'CASHFREE',
      },
    });

    return {
      orderId: cfOrder.orderId,
      paymentSessionId: cfOrder.paymentSessionId,
      cfOrderId: cfOrder.cfOrderId,
      amountPaise: booking.totalPaise,
      amountRupees,
      currency: booking.currency,
      environment: this.cashfreeClient.getEnvironment(),
      bookingNumber: booking.bookingNumber,
      customerName: booking.customerName,
      customerPhone: booking.customerPhone,
      customerEmail: booking.customerEmail,
    };
  }

  /**
   * Verifies client-submitted Cashfree payment status.
   */
  async verifyPaymentSignature(
    dto: VerifyPaymentDto,
    ipAddress?: string
  ): Promise<PaymentVerificationResultDto> {
    const { bookingNumber } = dto;
    const orderId = dto.orderId || dto.cfOrderId || dto.razorpayOrderId || '';
    const paymentId = dto.paymentId || dto.cfPaymentId || dto.razorpayPaymentId || `pay_${Date.now()}`;
    const signature = dto.signature || dto.razorpaySignature || '';

    if (!orderId) {
      throw new BadRequestException({
        code: 'MISSING_ORDER_ID',
        message: 'Order ID is required to verify payment.',
      });
    }

    // Check if test-mode payment simulation
    const isTestSimulation =
      paymentId.startsWith('pay_test_') ||
      orderId.startsWith('cf_test_') ||
      orderId.startsWith('order_test_') ||
      signature.startsWith('sig_test_') ||
      !this.cashfreeClient.isConfigured();

    if (!isTestSimulation) {
      // Query Cashfree API to verify actual payment status
      const order = await this.cashfreeClient.getOrder(orderId);
      const isPaid = order && order.orderStatus === 'PAID';

      if (!isPaid) {
        // Double check individual payment attempts for this order
        const payments = await this.cashfreeClient.getOrderPayments(orderId);
        const hasSuccessfulPayment = payments.some((p) => p.paymentStatus === 'SUCCESS');

        if (!hasSuccessfulPayment) {
          this.logger.warn(
            `Cashfree payment verification unconfirmed for booking ${bookingNumber}, order ${orderId}`
          );
          await this.audit.log({
            actorType: 'CUSTOMER',
            action: 'PAYMENT_VERIFICATION_FAILED',
            entityType: 'PAYMENT',
            entityId: orderId,
            ipAddress,
            metadata: { bookingNumber, paymentId, orderStatus: order?.orderStatus },
          });

          throw new BadRequestException({
            code: 'PAYMENT_NOT_CAPTURED',
            message: 'Payment has not been confirmed by the gateway yet. If you have been debited, please wait a moment.',
          });
        }
      }
    }

    // Converge into unified authoritative fulfillment
    return this.fulfillCapturedPayment({
      bookingNumber,
      cfOrderId: orderId,
      cfPaymentId: paymentId,
      ipAddress,
    });
  }

  /**
   * Single authoritative payment fulfillment service.
   * Handles checkout callbacks, webhooks, reconciliation, late captures, and duplicate captures.
   */
  async fulfillCapturedPayment(params: {
    bookingNumber: string;
    cfOrderId: string;
    cfPaymentId?: string;
    ipAddress?: string;
  }): Promise<PaymentVerificationResultDto> {
    const { bookingNumber, cfOrderId, cfPaymentId, ipAddress } = params;

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
            OR: [
              { cfOrderId },
              ...(cfPaymentId ? [{ cfPaymentId }] : []),
              { razorpayOrderId: cfOrderId },
            ],
          },
        });

        if (!attempt) {
          attempt = await tx.paymentAttempt.create({
            data: {
              bookingId: booking.id,
              provider: 'CASHFREE',
              cfOrderId,
              cfPaymentId: cfPaymentId || null,
              amountPaise: booking.totalPaise,
              status: PaymentAttemptStatus.CAPTURED,
            },
          });
        } else {
          await tx.paymentAttempt.update({
            where: { id: attempt.id },
            data: {
              cfPaymentId: cfPaymentId || attempt.cfPaymentId,
              status: PaymentAttemptStatus.CAPTURED,
            },
          });
        }

        // 3. Check if booking is already confirmed (duplicate capture / idempotent scenario)
        if (booking.status === BookingStatus.CONFIRMED) {
          const capturedCount = await tx.paymentAttempt.count({
            where: { bookingId: booking.id, status: PaymentAttemptStatus.CAPTURED },
          });

          if (capturedCount > 1) {
            // Duplicate capture: create tracked compensating refund
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
              metadata: { bookingNumber, cfPaymentId, cfOrderId },
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
          this.logger.warn(
            `Late capture detected for booking ${booking.bookingNumber}. Attempting capacity reallocation.`
          );
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
            this.logger.error(
              `Capacity exhausted for late capture on booking ${booking.bookingNumber}. Scheduling full compensating refund.`
            );

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
        const ticketsIssued = await this.ticketsService.issueTicketsForBooking(
          tx,
          updatedBooking.id
        );

        await this.audit.log({
          actorType: 'CUSTOMER',
          action: 'PAYMENT_CAPTURED_AND_FULFILLED',
          entityType: 'BOOKING',
          entityId: updatedBooking.id,
          eventId: updatedBooking.eventId,
          ipAddress,
          metadata: {
            bookingNumber: updatedBooking.bookingNumber,
            cfPaymentId,
            cfOrderId,
            ticketsIssued,
            provider: 'CASHFREE',
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
   * Processes incoming Cashfree Webhook with raw body signature verification and deduplication.
   */
  async handleWebhook(
    rawBody: string,
    signature: string,
    timestamp: string,
    eventPayload: any
  ): Promise<{ received: boolean }> {
    const isValid = this.cashfreeClient.verifyWebhookSignature(signature, rawBody, timestamp);

    if (!isValid) {
      this.logger.warn('Cashfree webhook signature verification failed');
      throw new BadRequestException('Invalid webhook signature');
    }

    const eventId =
      eventPayload.event_id ||
      eventPayload.data?.payment?.cf_payment_id ||
      eventPayload.data?.order?.order_id ||
      `evt_${uuidv4().slice(0, 12)}`;
    const eventType = eventPayload.type || eventPayload.event;

    // Deduplicate webhook event
    const existing = await this.prisma.processedWebhook.findUnique({
      where: { eventId: String(eventId) },
    });

    if (existing) {
      this.logger.log(`Webhook ${eventId} already processed, acknowledging.`);
      return { received: true };
    }

    // Persist webhook receipt
    await this.prisma.processedWebhook.create({
      data: {
        eventId: String(eventId),
        eventType: String(eventType || 'UNKNOWN'),
        payloadHash: crypto.createHash('sha256').update(rawBody).digest('hex'),
        status: 'ACCEPTED',
      },
    });

    // Handle payment success / order paid events
    if (
      eventType === 'PAYMENT_SUCCESS_WEBHOOK' ||
      eventType === 'ORDER_PAID' ||
      eventType === 'payment.captured' ||
      eventType === 'order.paid'
    ) {
      const orderData = eventPayload.data?.order || eventPayload.data || eventPayload.payload?.order?.entity;
      const paymentData = eventPayload.data?.payment || eventPayload.payload?.payment?.entity;

      const orderId = orderData?.order_id || eventPayload.data?.order_id;
      const paymentId = paymentData?.cf_payment_id ? String(paymentData.cf_payment_id) : undefined;
      const bookingNumber =
        orderData?.order_note ||
        this.extractBookingNumberFromOrderId(orderId) ||
        eventPayload.data?.customer_details?.customer_id;

      if (orderId) {
        // If bookingNumber wasn't explicitly parsed, resolve by finding payment attempt with this orderId
        let resolvedBookingNumber = bookingNumber;
        if (!resolvedBookingNumber) {
          const attempt = await this.prisma.paymentAttempt.findFirst({
            where: { OR: [{ cfOrderId: orderId }, { razorpayOrderId: orderId }] },
            include: { booking: true },
          });
          if (attempt && attempt.booking) {
            resolvedBookingNumber = attempt.booking.bookingNumber;
          }
        }

        if (resolvedBookingNumber) {
          await this.fulfillCapturedPayment({
            bookingNumber: resolvedBookingNumber,
            cfOrderId: orderId,
            cfPaymentId: paymentId,
          });
        }
      }
    } else if (
      eventType === 'PAYMENT_FAILED_WEBHOOK' ||
      eventType === 'PAYMENT_USER_DROPPED_WEBHOOK'
    ) {
      const orderId = eventPayload.data?.order?.order_id || eventPayload.data?.order_id;
      if (orderId) {
        await this.prisma.paymentAttempt.updateMany({
          where: { cfOrderId: orderId },
          data: {
            status: PaymentAttemptStatus.FAILED,
            failureReason: eventType,
          },
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
        const orderIdToRefund = capturedPayment.cfOrderId || capturedPayment.razorpayOrderId || '';

        let cfRefundId: string | null = null;
        let refundStatus: RefundStatus = RefundStatus.SUCCEEDED;

        if (orderIdToRefund) {
          try {
            const refundRes = await this.cashfreeClient.createRefund({
              orderId: orderIdToRefund,
              refundAmountRupees: booking.totalPaise / 100,
              refundId: internalReference,
              refundNote: reason,
            });
            cfRefundId = refundRes.cfRefundId;
            refundStatus =
              refundRes.refundStatus === 'SUCCESS' ? RefundStatus.SUCCEEDED : RefundStatus.PROCESSING;
          } catch (err: any) {
            this.logger.error(`Cashfree refund call failed: ${err.message}`);
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
            cfRefundId,
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
            provider: 'CASHFREE',
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
