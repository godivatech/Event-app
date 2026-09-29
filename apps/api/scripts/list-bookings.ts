import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Fetching all bookings from database...\n');

  const bookings = await prisma.booking.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      event: { select: { name: true, slug: true } },
      items: {
        include: {
          ticketType: { select: { name: true, unitPricePaise: true } },
        },
      },
      tickets: {
        select: {
          id: true,
          ticketNumber: true,
          status: true,
          attendeeName: true,
        },
      },
      paymentAttempts: {
        select: {
          id: true,
          status: true,
          amountPaise: true,
          provider: true,
        },
      },
    },
  });

  console.log(`Total Bookings Found: ${bookings.length}\n`);
  console.log('='.repeat(100));

  bookings.forEach((b, index) => {
    const totalTickets = b.items.reduce((sum, it) => sum + it.quantity, 0);
    const totalAmount = `₹${(b.totalPaise / 100).toLocaleString('en-IN')}`;
    const dateStr = b.createdAt.toISOString().replace('T', ' ').substring(0, 19);

    console.log(`[#${index + 1}] Booking Number: ${b.bookingNumber} | ID: ${b.id}`);
    console.log(`  Customer:      ${b.customerName} (${b.customerPhone}) | Email: ${b.customerEmail || 'N/A'}`);
    console.log(`  Business/Org:  ${b.businessName || 'N/A'} | Location: ${b.location || 'N/A'} | Age: ${b.age ?? 'N/A'}`);
    console.log(`  Member Type:   ${b.memberType || 'NON_MEMBER'} | Food: ${b.foodPreference}`);
    console.log(`  Status:        ${b.status} | Payment: ${b.paymentStatus} | Total: ${totalAmount} (${totalTickets} passes)`);
    console.log(`  Created At:    ${dateStr} (UTC)`);
    console.log(`  Tickets Gen:   ${b.tickets.length} issued [${b.tickets.map(t => `${t.ticketNumber} (${t.status})`).join(', ') || 'None'}]`);
    console.log(`  Items:         ${b.items.map(it => `${it.ticketType.name} x ${it.quantity}`).join(', ')}`);
    console.log('-'.repeat(100));
  });

  console.log('\nSummary:');
  const confirmed = bookings.filter(b => b.status === 'CONFIRMED').length;
  const pending = bookings.filter(b => b.status === 'PENDING').length;
  const cancelled = bookings.filter(b => b.status === 'CANCELLED').length;
  const members = bookings.filter(b => b.memberType === 'MEMBER').length;
  const nonMembers = bookings.filter(b => b.memberType !== 'MEMBER').length;

  console.log(`Confirmed: ${confirmed} | Pending: ${pending} | Cancelled: ${cancelled}`);
  console.log(`Members: ${members} | Non-Members/Delegates: ${nonMembers}`);
}

main()
  .catch((e) => {
    console.error('Error fetching bookings:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
