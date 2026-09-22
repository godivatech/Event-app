import { PrismaClient, UserRole, EventStatus, TicketTypeStatus, BookingStatus, ReservationStatus, PaymentAttemptStatus, TicketStatus, CheckInResult, PdfArtifactStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function encrypt(text: string, secretKeyHex: string): string {
  const key = Buffer.from(secretKeyHex, 'hex');
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

async function main() {
  console.log('🌱 Seeding CEDOI Ticketing Platform development data...');

  const encryptionKey = process.env.TICKET_ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

  // 1. Create Staff Accounts
  const defaultPasswordHash = await bcrypt.hash('Admin@123456', 10);

  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@cedoi.org' },
    update: { passwordHash: defaultPasswordHash, isActive: true },
    create: {
      email: 'superadmin@cedoi.org',
      passwordHash: defaultPasswordHash,
      name: 'CEDOI Super Administrator',
      role: UserRole.SUPER_ADMIN,
      isActive: true,
    },
  });

  const eventAdmin = await prisma.user.upsert({
    where: { email: 'admin@cedoi.org' },
    update: { passwordHash: defaultPasswordHash, isActive: true },
    create: {
      email: 'admin@cedoi.org',
      passwordHash: defaultPasswordHash,
      name: 'Priya Sharma (Event Operations)',
      role: UserRole.ADMIN,
      isActive: true,
    },
  });

  const scannerStaff = await prisma.user.upsert({
    where: { email: 'scanner@cedoi.org' },
    update: { passwordHash: defaultPasswordHash, isActive: true },
    create: {
      email: 'scanner@cedoi.org',
      passwordHash: defaultPasswordHash,
      name: 'Rohan Verma (Gate Staff)',
      role: UserRole.SCANNER,
      isActive: true,
    },
  });

  console.log('✅ Staff users created/verified');

  // 2. Create Event: CEDOI AWARDS 2026
  const summitStarts = new Date('2026-10-10T03:30:00.000Z'); // Saturday, Oct 10, 2026 09:00 AM IST
  const summitEnds = new Date('2026-10-10T12:30:00.000Z');   // Saturday, Oct 10, 2026 06:00 PM IST

  const event = await prisma.event.upsert({
    where: { slug: 'cedoi-awards-2026' },
    update: {
      name: 'CEDOI AWARDS 2026',
      tagline: 'RECOGNISE • CELEBRATE • INSPIRE',
      status: EventStatus.PUBLISHED,
      startsAt: summitStarts,
      endsAt: summitEnds,
      timezone: 'Asia/Kolkata',
      venue: 'Velammal Ida Scudder Auditorium, Madurai',
      address: 'Velammal Ida Scudder Auditorium, Ring Road, Anuppanadi, Madurai, Tamil Nadu 625009',
      totalCapacity: 1500,
    },
    create: {
      slug: 'cedoi-awards-2026',
      name: 'CEDOI AWARDS 2026',
      tagline: 'RECOGNISE • CELEBRATE • INSPIRE',
      description: 'Be a part of the Biggest Entrepreneurship Celebration in Tamilnadu! Join 1,500 business owners for an unforgettable celebration featuring celebrity entertainment, knowledge updates, motivational speeches, gourmet lunch & beverages, ₹10,000 worth discount coupons, and exclusive return gifts & lucky draws.',
      venue: 'Velammal Ida Scudder Auditorium, Madurai',
      address: 'Velammal Ida Scudder Auditorium, Ring Road, Anuppanadi, Madurai, Tamil Nadu 625009',
      startsAt: summitStarts,
      endsAt: summitEnds,
      timezone: 'Asia/Kolkata',
      status: EventStatus.PUBLISHED,
      totalCapacity: 1500,
      bannerUrl: '/images/cedoi-summit-banner.jpg',
    },
  });

  console.log(`✅ Event configured: ${event.name} (${event.slug})`);

  // 3. Create Gates
  const gateA = await prisma.gate.upsert({
    where: { eventId_code: { eventId: event.id, code: 'GATE-A' } },
    update: { name: 'Main Auditorium Entrance', isActive: true },
    create: {
      eventId: event.id,
      name: 'Main Auditorium Entrance',
      code: 'GATE-A',
      description: 'Primary gate for CEDOI Awards attendees',
      isActive: true,
    },
  });

  const gateVip = await prisma.gate.upsert({
    where: { eventId_code: { eventId: event.id, code: 'GATE-VIP' } },
    update: { name: 'VIP & Dignitary Entrance', isActive: true },
    create: {
      eventId: event.id,
      name: 'VIP & Dignitary Entrance',
      code: 'GATE-VIP',
      description: 'Dedicated gate for speakers and VIP dignitaries',
      isActive: true,
    },
  });

  // Assign staff to event & gate
  await prisma.eventStaffAssignment.upsert({
    where: { eventId_userId: { eventId: event.id, userId: scannerStaff.id } },
    update: { gateId: gateA.id, role: UserRole.SCANNER },
    create: {
      eventId: event.id,
      userId: scannerStaff.id,
      gateId: gateA.id,
      role: UserRole.SCANNER,
    },
  });

  await prisma.eventStaffAssignment.upsert({
    where: { eventId_userId: { eventId: event.id, userId: eventAdmin.id } },
    update: { role: UserRole.ADMIN },
    create: {
      eventId: event.id,
      userId: eventAdmin.id,
      role: UserRole.ADMIN,
    },
  });

  // 4. Ticket Categories: Single Ticket Only - Rs. 1,499 (149,900 paise), 1500 capacity
  const memberType = await prisma.ticketType.upsert({
    where: { id: `${event.id}-member-pass` },
    update: {
      name: 'CEDOI Member Pass',
      description: 'All-inclusive entry for CEDOI members: 1,500 Business Owners networking, knowledge updates, unlimited celebrity entertainment, motivational speeches, gourmet lunch & beverages, ₹10,000 discount coupons, return gift & lucky draw.',
      unitPricePaise: 149900,
      capacity: 1500,
      status: TicketTypeStatus.ACTIVE,
    },
    create: {
      id: `${event.id}-member-pass`,
      eventId: event.id,
      name: 'CEDOI Member Pass',
      description: 'All-inclusive entry for CEDOI members: 1,500 Business Owners networking, knowledge updates, unlimited celebrity entertainment, motivational speeches, gourmet lunch & beverages, ₹10,000 discount coupons, return gift & lucky draw.',
      unitPricePaise: 149900,
      capacity: 1500,
      maxPerBooking: 10,
      sortOrder: 1,
      status: TicketTypeStatus.ACTIVE,
    },
  });

  // Hide legacy multi-tier ticket types
  await prisma.ticketType.updateMany({
    where: {
      eventId: event.id,
      name: { in: ['General Admission', 'VIP Delegate Pass', 'VVIP Founder & Investor Pass'] },
    },
    data: { status: TicketTypeStatus.INACTIVE },
  });

  console.log('✅ Ticket category seeded: CEDOI Member Pass (Rs. 1,499)');

  // 5. Seed sample completed booking with real tickets for dev inspection
  const sampleBookingNumber = 'BK-20261025-SEED01';
  const existingBooking = await prisma.booking.findUnique({
    where: { bookingNumber: sampleBookingNumber },
  });

  if (!existingBooking) {
    const rawRecoveryCode = 'CEDOI-DEMO-2026-PASS';
    const recoveryCodeHash = sha256(rawRecoveryCode);

    const booking = await prisma.booking.create({
      data: {
        bookingNumber: sampleBookingNumber,
        eventId: event.id,
        customerName: 'Aarav Mehta',
        customerPhone: '+919876543210',
        customerEmail: 'aarav.mehta@example.com',
        currency: 'INR',
        subtotalPaise: 250000,
        totalPaise: 250000,
        status: BookingStatus.CONFIRMED,
        recoveryCodeHash: recoveryCodeHash,
        items: {
          create: [
            {
              ticketTypeId: generalType.id,
              quantity: 2,
              unitPricePaise: 50000,
              lineTotalPaise: 100000,
            },
            {
              ticketTypeId: vipType.id,
              quantity: 1,
              unitPricePaise: 150000,
              lineTotalPaise: 150000,
            },
          ],
        },
        paymentAttempts: {
          create: [
            {
              attemptNumber: 1,
              razorpayOrderId: 'order_seed_001',
              razorpayPaymentId: 'pay_seed_001_captured',
              razorpaySignature: 'sig_seed_verified_signature',
              amountPaise: 250000,
              currency: 'INR',
              status: PaymentAttemptStatus.CAPTURED,
            },
          ],
        },
      },
      include: { items: true },
    });

    // Create 3 tickets (2 General + 1 VIP)
    for (const item of booking.items) {
      for (let i = 1; i <= item.quantity; i++) {
        const ticketNumber = `TKT-SEED-${item.ticketTypeId.split('-').pop()}-${i}`;
        const rawQrToken = `CEDOI_QR_${crypto.randomBytes(16).toString('hex')}`;
        const qrHash = sha256(rawQrToken);
        const encryptedQr = encrypt(rawQrToken, encryptionKey);

        const ticket = await prisma.ticket.create({
          data: {
            bookingId: booking.id,
            bookingItemId: item.id,
            ticketTypeId: item.ticketTypeId,
            admissionIndex: i,
            ticketNumber,
            qrCredentialHash: qrHash,
            encryptedQrToken: encryptedQr,
            status: TicketStatus.ACTIVE,
          },
        });

        // Let's mark the first ticket as checked-in for demo data
        if (i === 1 && item.ticketTypeId === generalType.id) {
          await prisma.ticket.update({
            where: { id: ticket.id },
            data: { status: TicketStatus.USED },
          });

          await prisma.checkIn.create({
            data: {
              ticketId: ticket.id,
              eventId: event.id,
              gateId: gateA.id,
              staffUserId: scannerStaff.id,
              requestId: `req-seed-checkin-${ticket.id}`,
              result: CheckInResult.SUCCESS,
              notes: 'Admitted at South Gate',
            },
          });
        }
      }
    }

    // Add PDF artifact record
    await prisma.pdfArtifact.create({
      data: {
        bookingId: booking.id,
        status: PdfArtifactStatus.READY,
        fileUrl: `/api/v1/tickets/${booking.bookingNumber}/pdf`,
      },
    });

    console.log(`✅ Sample confirmed booking created: ${sampleBookingNumber} with recovery code: ${rawRecoveryCode}`);
  }

  console.log('✨ Database seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
