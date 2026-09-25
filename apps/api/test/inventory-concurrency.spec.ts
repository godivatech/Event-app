import { PrismaClient, EventStatus, TicketTypeStatus } from '@prisma/client';
import { InventoryService } from '../src/modules/inventory/inventory.service';
import { BookingsService } from '../src/modules/bookings/bookings.service';
import { AuditService } from '../src/modules/audit/audit.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { ConflictException } from '@nestjs/common';

describe('Inventory Concurrency & Atomicity (PostgreSQL Integration)', () => {
  let prisma: PrismaService;
  let inventoryService: InventoryService;
  let bookingsService: BookingsService;
  let auditService: AuditService;
  let testEventId: string;
  let typeAId: string;
  let typeBId: string;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.$connect();
    inventoryService = new InventoryService(prisma);
    auditService = new AuditService(prisma);
    bookingsService = new BookingsService(prisma, inventoryService, {} as any, auditService);

    // Create isolated test event with tight capacities for testing
    const event = await prisma.event.create({
      data: {
        slug: `test-inventory-${Date.now()}`,
        name: 'Inventory Test Event',
        description: 'Test event description for inventory testing',
        venue: 'Test Hall',
        address: '123 Test St',
        startsAt: new Date(Date.now() + 86400000),
        endsAt: new Date(Date.now() + 90000000),
        status: EventStatus.PUBLISHED,
        ticketTypes: {
          create: [
            {
              name: 'Limited Category A',
              unitPricePaise: 10000,
              capacity: 5, // Exactly 5 tickets
              maxPerBooking: 10,
              status: TicketTypeStatus.ACTIVE,
            },
            {
              name: 'Limited Category B',
              unitPricePaise: 20000,
              capacity: 2, // Exactly 2 tickets
              maxPerBooking: 10,
              status: TicketTypeStatus.ACTIVE,
            },
          ],
        },
      },
      include: { ticketTypes: true },
    });

    testEventId = event.id;
    typeAId = event.ticketTypes.find((t) => t.name === 'Limited Category A')!.id;
    typeBId = event.ticketTypes.find((t) => t.name === 'Limited Category B')!.id;
  });

  afterAll(async () => {
    if (testEventId) {
      await prisma.checkIn.deleteMany({
        where: { eventId: testEventId },
      });
      await prisma.ticket.deleteMany({
        where: { booking: { eventId: testEventId } },
      });
      await prisma.reservationItem.deleteMany({
        where: { ticketType: { eventId: testEventId } },
      });
      await prisma.reservation.deleteMany({
        where: { booking: { eventId: testEventId } },
      });
      await prisma.paymentAttempt.deleteMany({
        where: { booking: { eventId: testEventId } },
      });
      await prisma.bookingItem.deleteMany({
        where: { booking: { eventId: testEventId } },
      });
      await prisma.booking.deleteMany({
        where: { eventId: testEventId },
      });
      await prisma.ticketType.deleteMany({
        where: { eventId: testEventId },
      });
      await prisma.event.delete({
        where: { id: testEventId },
      });
    }
    await prisma.$disconnect();
  });

  it('Requirement: Mixed-category reservation rolls back fully on insufficient quantity in ANY category', async () => {
    // Attempt mixed reservation: 2 of Category A (valid), but 3 of Category B (exceeds capacity of 2!)
    await expect(
      inventoryService.reserveInventory(testEventId, [
        { ticketTypeId: typeAId, quantity: 2 },
        { ticketTypeId: typeBId, quantity: 3 }, // OVER CAPACITY
      ])
    ).rejects.toThrow(ConflictException);

    // Verify Category A was NOT reserved (clean rollback)
    const heldAgg = await prisma.reservationItem.aggregate({
      where: {
        ticketTypeId: typeAId,
        reservation: { status: 'HELD', expiresAt: { gt: new Date() } },
      },
      _sum: { quantity: true },
    });

    expect(heldAgg._sum.quantity || 0).toEqual(0);
  });

  it('Requirement: Simultaneous purchase of last available admissions allows only one to succeed', async () => {
    // Category B has capacity 2.
    // Concurrently try two reservations of 2 tickets each via BookingsService.
    // Exactly ONE must succeed and the other MUST fail with ConflictException.

    const req1 = bookingsService.createReservation({
      eventId: testEventId,
      customerName: 'Buyer 1',
      customerPhone: '+919999900001',
      items: [{ ticketTypeId: typeBId, quantity: 2 }],
    });
    const req2 = bookingsService.createReservation({
      eventId: testEventId,
      customerName: 'Buyer 2',
      customerPhone: '+919999900002',
      items: [{ ticketTypeId: typeBId, quantity: 2 }],
    });

    const results = await Promise.allSettled([req1, req2]);

    const successes = results.filter((r) => r.status === 'fulfilled');
    const failures = results.filter((r) => r.status === 'rejected');

    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);
  });

  it('Requirement: Expiry/release runs repeatedly without changing inventory twice', async () => {
    const expiredCountFirst = await inventoryService.expireStaleReservations();
    const expiredCountSecond = await inventoryService.expireStaleReservations();

    expect(typeof expiredCountFirst).toBe('number');
    // Second execution must be 0 (idempotent, no double release)
    expect(expiredCountSecond).toBe(0);
  });
});
