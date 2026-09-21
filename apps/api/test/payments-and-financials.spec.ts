import { PrismaService } from '../src/prisma/prisma.service';
import { PaymentsService } from '../src/modules/payments/payments.service';
import { InventoryService } from '../src/modules/inventory/inventory.service';
import { TicketsService } from '../src/modules/tickets/tickets.service';
import { OutboxService } from '../src/modules/jobs/outbox.service';
import { AuditService } from '../src/modules/audit/audit.service';
import { BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';

describe('Payments & Financial Lifecycle', () => {
  let prisma: PrismaService;
  let paymentsService: PaymentsService;
  let inventoryService: InventoryService;
  let ticketsService: TicketsService;
  let outboxService: OutboxService;
  let auditService: AuditService;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    outboxService = new OutboxService(prisma);
    auditService = new AuditService(prisma);
    inventoryService = new InventoryService(prisma);
    ticketsService = new TicketsService(prisma, outboxService);
    paymentsService = new PaymentsService(
      prisma,
      inventoryService,
      ticketsService,
      auditService
    );
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('Requirement: Invalid signatures and mismatched provider orders are strictly rejected', async () => {
    const invalidPayload = {
      bookingNumber: 'BK-20261025-SEED01',
      razorpayOrderId: 'order_test_123',
      razorpayPaymentId: 'pay_test_456',
      razorpaySignature: 'invalid_fraudulent_signature_value',
    };

    await expect(paymentsService.verifyPaymentSignature(invalidPayload)).rejects.toThrow(
      BadRequestException
    );
  });

  it('Requirement: Duplicate webhooks are accepted idempotently without duplicate fulfillment', async () => {
    const eventId = `evt_dedup_${Date.now()}`;
    const payload = {
      event_id: eventId,
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            id: 'pay_mock_123',
            order_id: 'order_mock_456',
            notes: { bookingNumber: 'BK-20261025-SEED01' },
          },
        },
      },
    };

    const rawBody = JSON.stringify(payload);
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || 'mock_webhook_secret_cedoi_test';
    const validSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody)
      .digest('hex');

    // First arrival
    const res1 = await paymentsService.handleWebhook(rawBody, validSignature, payload);
    expect(res1.received).toBe(true);

    // Replay arrival with identical event_id
    const res2 = await paymentsService.handleWebhook(rawBody, validSignature, payload);
    expect(res2.received).toBe(true);

    // Verify exactly one record was persisted in ProcessedWebhook
    const webhookRecords = await prisma.processedWebhook.count({
      where: { eventId },
    });
    expect(webhookRecords).toBe(1);
  });

  it('Requirement: Voluntary refund is blocked if one or more tickets have already been admitted', async () => {
    // BK-20261025-SEED01 has one ticket checked in (USED) from our seed script
    await expect(
      paymentsService.adminRefundBooking(
        'BK-20261025-SEED01',
        'staff_test_id',
        'Customer requested refund'
      )
    ).rejects.toThrow(BadRequestException);
  });
});
