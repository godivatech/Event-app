import { PrismaService } from '../src/prisma/prisma.service';
import { CheckInsService } from '../src/modules/check-ins/check-ins.service';
import { AuditService } from '../src/modules/audit/audit.service';
import { CheckInResult, TicketStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

describe('Scanner Check-In Concurrency & Idempotency', () => {
  let prisma: PrismaService;
  let checkInsService: CheckInsService;
  let auditService: AuditService;
  let sampleActiveTicket: any;
  let staffUser: any;
  let testEvent: any;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    auditService = new AuditService(prisma);
    checkInsService = new CheckInsService(prisma, auditService);

    testEvent =
      (await prisma.event.findFirst({
        where: { slug: 'cedoi-awards-2026' },
        include: { gates: true },
      })) ||
      (await prisma.event.findFirst({
        include: { gates: true },
      }));

    staffUser = await prisma.user.findFirst({
      where: { email: 'scanner@cedoi.org' },
    });

    // Set event startsAt to current time so scanning window is open for test
    await prisma.event.update({
      where: { id: testEvent.id },
      data: {
        startsAt: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
        endsAt: new Date(Date.now() + 1000 * 60 * 60 * 8), // 8 hours future
      },
    });

    // Find an ACTIVE ticket from the seed data
    sampleActiveTicket = await prisma.ticket.findFirst({
      where: {
        status: TicketStatus.ACTIVE,
        booking: { eventId: testEvent.id },
      },
    });
  });

  afterAll(async () => {
    if (sampleActiveTicket) {
      await prisma.checkIn.deleteMany({
        where: { ticketId: sampleActiveTicket.id },
      });
      await prisma.ticket.update({
        where: { id: sampleActiveTicket.id },
        data: { status: TicketStatus.ACTIVE },
      });
    }

    // Restore summit start time
    if (testEvent) {
      await prisma.event.update({
        where: { id: testEvent.id },
        data: {
          startsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000 + 9 * 60 * 60 * 1000),
        },
      });
    }
    await prisma.$disconnect();
  });

  it('Requirement: Lost check-in response and identical-request retry returns original outcome without another admission record', async () => {
    if (!sampleActiveTicket) return;

    const requestId = `req_idempotent_${uuidv4()}`;

    // First scan attempt
    const result1 = await checkInsService.checkIn(
      {
        eventId: testEvent.id,
        ticketNumber: sampleActiveTicket.ticketNumber,
        requestId,
      },
      staffUser.id
    );

    expect(result1.result).toBe(CheckInResult.SUCCESS);
    expect(result1.isDuplicateRequest).toBe(false);

    // Network retry with SAME requestId
    const result2 = await checkInsService.checkIn(
      {
        eventId: testEvent.id,
        ticketNumber: sampleActiveTicket.ticketNumber,
        requestId,
      },
      staffUser.id
    );

    expect(result2.result).toBe(CheckInResult.SUCCESS);
    expect(result2.isDuplicateRequest).toBe(true);

    // Verify exactly ONE CheckIn record exists for this requestId
    const checkInRecords = await prisma.checkIn.count({
      where: { requestId },
    });
    expect(checkInRecords).toBe(1);
  });

  it('Requirement: Subsequent new scan of an already admitted ticket returns ALREADY_USED', async () => {
    if (!sampleActiveTicket) return;

    const newRequestId = `req_new_scan_${uuidv4()}`;

    const result = await checkInsService.checkIn(
      {
        eventId: testEvent.id,
        ticketNumber: sampleActiveTicket.ticketNumber,
        requestId: newRequestId,
      },
      staffUser.id
    );

    expect(result.result).toBe(CheckInResult.ALREADY_USED);
    expect(result.firstAdmittedAt).toBeDefined();
  });

  it('Requirement: Rejects invalid tickets or fake QR codes with INVALID', async () => {
    const fakeRequestId = `req_fake_${uuidv4()}`;

    const result = await checkInsService.checkIn(
      {
        eventId: testEvent.id,
        ticketNumber: 'TKT-NON-EXISTENT-999999',
        requestId: fakeRequestId,
      },
      staffUser.id
    );

    expect(result.result).toBe(CheckInResult.INVALID);
  });
});
