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

  // 2. Create Event: CEDOI Entrepreneur Summit 2026
  const summitStarts = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days in future
  summitStarts.setUTCHours(3, 30, 0, 0); // 09:00 IST
  const summitEnds = new Date(summitStarts.getTime() + 9 * 60 * 60 * 1000); // 18:00 IST

  const event = await prisma.event.upsert({
    where: { slug: 'cedoi-summit-2026' },
    update: {
      name: 'CEDOI Entrepreneur Summit 2026',
      tagline: 'BUILDING OUTSTANDING ENTREPRENEURS',
      status: EventStatus.PUBLISHED,
      startsAt: summitStarts,
      endsAt: summitEnds,
      timezone: 'Asia/Kolkata',
      venue: 'Courtyard by Marriott, Madurai',
      address: '168, Alagar Kovil Main Rd, Tallakulam, Madurai, Tamil Nadu 625002',
      totalCapacity: 2000,
    },
    create: {
      slug: 'cedoi-summit-2026',
      name: 'CEDOI Entrepreneur Summit 2026',
      tagline: 'BUILDING OUTSTANDING ENTREPRENEURS',
      description: 'The premier annual summit dedicated to empowering the next generation of founders, visionary leaders, and outstanding entrepreneurs. Features high-impact keynote addresses, founder masterclasses, angel investor networking lounges, and interactive venture showcases.',
      venue: 'Courtyard by Marriott, Madurai',
      address: '168, Alagar Kovil Main Rd, Tallakulam, Madurai, Tamil Nadu 625002',
      startsAt: summitStarts,
      endsAt: summitEnds,
      timezone: 'Asia/Kolkata',
      status: EventStatus.PUBLISHED,
      totalCapacity: 2000,
      bannerUrl: '/images/cedoi-summit-banner.jpg',
    },
  });

  console.log(`✅ Event configured: ${event.name} (${event.slug})`);

  // 3. Create Gates
  const gateA = await prisma.gate.upsert({
    where: { eventId_code: { eventId: event.id, code: 'GATE-A' } },
    update: { name: 'Main Entrance (South Gate)', isActive: true },
    create: {
      eventId: event.id,
      name: 'Main Entrance (South Gate)',
      code: 'GATE-A',
      description: 'Primary gate for General Admission attendees',
      isActive: true,
    },
  });

  const gateVip = await prisma.gate.upsert({
    where: { eventId_code: { eventId: event.id, code: 'GATE-VIP' } },
    update: { name: 'VIP & Speaker Entrance (North Gate)', isActive: true },
    create: {
      eventId: event.id,
      name: 'VIP & Speaker Entrance (North Gate)',
      code: 'GATE-VIP',
      description: 'Dedicated gate for VIP and VVIP badge holders',
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

  // 4. Ticket Categories
  // General Admission (Rs. 500 = 50,000 paise), 1500 capacity
  const generalType = await prisma.ticketType.upsert({
    where: { id: `${event.id}-general` },
    update: {
      unitPricePaise: 50000,
      capacity: 1500,
      status: TicketTypeStatus.ACTIVE,
    },
    create: {
      id: `${event.id}-general`,
      eventId: event.id,
      name: 'General Admission',
      description: 'Full day access to main stage keynotes, venture showcases, and open exhibition floor.',
      unitPricePaise: 50000,
      capacity: 1500,
      maxPerBooking: 10,
      sortOrder: 1,
      status: TicketTypeStatus.ACTIVE,
    },
  });

  // VIP Pass (Rs. 1,500 = 150,000 paise), 400 capacity
  const vipType = await prisma.ticketType.upsert({
    where: { id: `${event.id}-vip` },
    update: {
      unitPricePaise: 150000,
      capacity: 400,
      status: TicketTypeStatus.ACTIVE,
    },
    create: {
      id: `${event.id}-vip`,
      eventId: event.id,
      name: 'VIP Delegate Pass',
      description: 'Priority seating in rows 3-10, access to catered networking lunch, and exclusive founder panel sessions.',
      unitPricePaise: 150000,
      capacity: 400,
      maxPerBooking: 5,
      sortOrder: 2,
      status: TicketTypeStatus.ACTIVE,
    },
  });

  // VVIP All-Access (Rs. 3,500 = 350,000 paise), 100 capacity
  const vvipType = await prisma.ticketType.upsert({
    where: { id: `${event.id}-vvip` },
    update: {
      unitPricePaise: 350000,
      capacity: 100,
      status: TicketTypeStatus.ACTIVE,
    },
    create: {
      id: `${event.id}-vvip`,
      eventId: event.id,
      name: 'VVIP Founder & Investor Pass',
      description: 'Front-row seating, private VIP lounge access, 1-on-1 investor matchmaking session, and invitation to the evening reception.',
      unitPricePaise: 350000,
      capacity: 100,
      maxPerBooking: 2,
      sortOrder: 3,
      status: TicketTypeStatus.ACTIVE,
    },
  });

  console.log('✅ Ticket categories seeded (General, VIP, VVIP)');

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
