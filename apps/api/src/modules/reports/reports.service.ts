import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  TicketStatus,
  ReservationStatus,
  PaymentAttemptStatus,
  RefundStatus,
  BookingStatus,
} from '@prisma/client';
import { AdminDashboardMetricsDto } from '@cedoi/contracts';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calculates authoritative, real database aggregates for the Admin Dashboard.
   */
  async getDashboardMetrics(eventId?: string): Promise<AdminDashboardMetricsDto> {
    const event = eventId
      ? await this.prisma.event.findUnique({
          where: { id: eventId },
          include: { ticketTypes: { where: { status: 'ACTIVE' }, orderBy: { sortOrder: 'asc' } } },
        })
      : await this.prisma.event.findFirst({
          where: { status: 'PUBLISHED' },
          include: { ticketTypes: { where: { status: 'ACTIVE' }, orderBy: { sortOrder: 'asc' } } },
          orderBy: { startsAt: 'asc' },
        });

    if (!event) {
      throw new NotFoundException('No active event found for metrics calculation.');
    }

    const now = new Date();

    // 1. Calculate capacity and ticket aggregates
    let totalCapacity = 0;
    const categoryBreakdown = [];

    for (const tt of event.ticketTypes) {
      totalCapacity += tt.capacity;

      const soldCount = await this.prisma.ticket.count({
        where: {
          ticketTypeId: tt.id,
          status: { in: [TicketStatus.ACTIVE, TicketStatus.USED] },
        },
      });

      const checkedInCount = await this.prisma.ticket.count({
        where: {
          ticketTypeId: tt.id,
          status: TicketStatus.USED,
        },
      });

      const heldAgg = await this.prisma.reservationItem.aggregate({
        where: {
          ticketTypeId: tt.id,
          reservation: {
            status: ReservationStatus.HELD,
            expiresAt: { gt: now },
          },
        },
        _sum: { quantity: true },
      });
      const reservedCount = heldAgg._sum.quantity || 0;

      const availableCount = Math.max(0, tt.capacity - (soldCount + reservedCount));

      categoryBreakdown.push({
        ticketTypeId: tt.id,
        name: tt.name,
        unitPricePaise: tt.unitPricePaise,
        capacity: tt.capacity,
        sold: soldCount,
        reserved: reservedCount,
        available: availableCount,
        checkedIn: checkedInCount,
      });
    }

    const totalSold = categoryBreakdown.reduce((acc, c) => acc + c.sold, 0);
    const totalReserved = categoryBreakdown.reduce((acc, c) => acc + c.reserved, 0);
    const totalCheckedIn = categoryBreakdown.reduce((acc, c) => acc + c.checkedIn, 0);
    const totalAvailable = Math.max(0, totalCapacity - (totalSold + totalReserved));

    const totalCancelled = await this.prisma.ticket.count({
      where: {
        booking: { eventId: event.id },
        status: TicketStatus.CANCELLED,
      },
    });

    // 2. Financial Aggregates
    const grossAgg = await this.prisma.paymentAttempt.aggregate({
      where: {
        booking: { eventId: event.id },
        status: PaymentAttemptStatus.CAPTURED,
      },
      _sum: { amountPaise: true },
    });
    const grossCollectionsPaise = grossAgg._sum.amountPaise || 0;

    const refundAgg = await this.prisma.refund.aggregate({
      where: {
        booking: { eventId: event.id },
        status: RefundStatus.SUCCEEDED,
      },
      _sum: { amountPaise: true },
    });
    const refundsPaise = refundAgg._sum.amountPaise || 0;

    // 3. Catering & Membership Aggregates
    const [totalVeg, totalNonVeg, totalMembers, totalNonMembers] = await Promise.all([
      this.prisma.ticket.count({
        where: {
          booking: { eventId: event.id },
          status: { in: [TicketStatus.ACTIVE, TicketStatus.USED] },
          foodPreference: 'VEG',
        },
      }),
      this.prisma.ticket.count({
        where: {
          booking: { eventId: event.id },
          status: { in: [TicketStatus.ACTIVE, TicketStatus.USED] },
          foodPreference: 'NON_VEG',
        },
      }),
      this.prisma.ticket.count({
        where: {
          booking: { eventId: event.id },
          status: { in: [TicketStatus.ACTIVE, TicketStatus.USED] },
          memberType: 'MEMBER',
        },
      }),
      this.prisma.ticket.count({
        where: {
          booking: { eventId: event.id },
          status: { in: [TicketStatus.ACTIVE, TicketStatus.USED] },
          memberType: 'NON_MEMBER',
        },
      }),
    ]);

    const netCollectionsPaise = grossCollectionsPaise - refundsPaise;

    return {
      event: {
        id: event.id,
        name: event.name,
        status: event.status as any,
        totalCapacity: event.totalCapacity,
      },
      tickets: {
        totalCapacity,
        totalSold,
        totalReserved,
        totalAvailable,
        totalCheckedIn,
        totalCancelled,
      },
      catering: {
        totalVeg,
        totalNonVeg,
      },
      membership: {
        totalMembers,
        totalNonMembers,
      },
      financials: {
        grossCollectionsPaise,
        refundsPaise,
        netCollectionsPaise,
        currency: 'INR',
      },
      categoryBreakdown,
    };
  }

  async getAdminBookings(params: {
    eventId?: string;
    status?: BookingStatus;
    memberType?: string;
    foodPreference?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.eventId) where.eventId = params.eventId;
    if (params.status) where.status = params.status;
    if (params.memberType) where.memberType = params.memberType;
    if (params.foodPreference) where.foodPreference = params.foodPreference;
    if (params.search) {
      const q = params.search.trim();
      where.OR = [
        { bookingNumber: { contains: q, mode: 'insensitive' } },
        { customerName: { contains: q, mode: 'insensitive' } },
        { customerPhone: { contains: q } },
        { customerEmail: { contains: q, mode: 'insensitive' } },
        { businessName: { contains: q, mode: 'insensitive' } },
        { location: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      this.prisma.booking.count({ where }),
      this.prisma.booking.findMany({
        where,
        include: {
          event: true,
          items: { include: { ticketType: true } },
          paymentAttempts: { orderBy: { createdAt: 'desc' }, take: 1 },
          refunds: true,
          _count: { select: { tickets: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getAdminPayments(params: { eventId?: string; page?: number; limit?: number }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = params.eventId ? { booking: { eventId: params.eventId } } : {};

    const [total, attempts, refunds] = await Promise.all([
      this.prisma.paymentAttempt.count({ where }),
      this.prisma.paymentAttempt.findMany({
        where,
        include: {
          booking: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.refund.findMany({
        where: params.eventId ? { booking: { eventId: params.eventId } } : {},
        include: { booking: true },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    return {
      attempts,
      refunds,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getAdminTickets(params: {
    eventId?: string;
    status?: TicketStatus;
    memberType?: string;
    foodPreference?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.eventId) where.booking = { eventId: params.eventId };
    if (params.status) where.status = params.status;
    if (params.memberType) where.memberType = params.memberType;
    if (params.foodPreference) where.foodPreference = params.foodPreference;
    if (params.search) {
      const q = params.search.trim();
      where.OR = [
        { ticketNumber: { contains: q, mode: 'insensitive' } },
        { attendeeName: { contains: q, mode: 'insensitive' } },
        { businessName: { contains: q, mode: 'insensitive' } },
        { location: { contains: q, mode: 'insensitive' } },
        { booking: { customerName: { contains: q, mode: 'insensitive' } } },
        { booking: { customerPhone: { contains: q } } },
      ];
    }

    const [total, tickets] = await Promise.all([
      this.prisma.ticket.count({ where }),
      this.prisma.ticket.findMany({
        where,
        include: {
          ticketType: true,
          booking: true,
          checkIns: {
            where: { result: 'SUCCESS' },
            include: { gate: true, staffUser: true },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      tickets,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getAdminCheckIns(params: { eventId?: string; page?: number; limit?: number }) {
    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 20));
    const skip = (page - 1) * limit;

    const where: any = params.eventId ? { eventId: params.eventId } : {};

    const [total, items] = await Promise.all([
      this.prisma.checkIn.count({ where }),
      this.prisma.checkIn.findMany({
        where,
        include: {
          ticket: { include: { ticketType: true, booking: true } },
          gate: true,
          staffUser: true,
        },
        orderBy: { checkedInAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getAuditLogs(limit: number = 50) {
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  /**
   * Generates UTF-8 CSV with BOM and formula injection protection.
   */
  async exportCsv(type: 'sales' | 'tickets' | 'checkins', eventId?: string): Promise<string> {
    const sanitize = (val: any): string => {
      if (val === null || val === undefined) return '';
      let str = String(val).replace(/"/g, '""');
      // Protect against CSV formula injection (=, +, -, @)
      if (/^[=+\-@]/.test(str)) {
        str = `'${str}`;
      }
      return `"${str}"`;
    };

    let csvContent = '\uFEFF'; // UTF-8 BOM for Excel compatibility

    if (type === 'sales') {
      const headers = [
        'Booking Number',
        'Customer Name',
        'Phone',
        'Email',
        'Business / Company',
        'Location / City',
        'Membership Type',
        'Food Preference',
        'Amount (INR)',
        'Status',
        'Created At',
      ];
      csvContent += headers.map(sanitize).join(',') + '\n';

      const bookings = await this.prisma.booking.findMany({
        where: eventId ? { eventId } : {},
        orderBy: { createdAt: 'desc' },
        take: 5000,
      });

      for (const b of bookings) {
        const row = [
          b.bookingNumber,
          b.customerName,
          b.customerPhone,
          b.customerEmail || '',
          b.businessName || '',
          b.location || '',
          b.memberType === 'MEMBER' ? 'Member' : 'Non-Member',
          b.foodPreference === 'NON_VEG' ? 'Non-Veg' : 'Veg',
          (b.totalPaise / 100).toFixed(2),
          b.status,
          b.createdAt.toISOString(),
        ];
        csvContent += row.map(sanitize).join(',') + '\n';
      }
    } else if (type === 'tickets') {
      const headers = [
        'Ticket Number',
        'Booking Number',
        'Pass Type',
        'Attendee Name',
        'Buyer Name',
        'Phone',
        'Business / Company',
        'Location / City',
        'Membership Type',
        'Food Preference',
        'Status',
        'Admission Index',
        'Created At',
      ];
      csvContent += headers.map(sanitize).join(',') + '\n';

      const tickets = await this.prisma.ticket.findMany({
        where: eventId ? { booking: { eventId } } : {},
        include: { ticketType: true, booking: true },
        orderBy: { createdAt: 'desc' },
        take: 5000,
      });

      for (const t of tickets) {
        const row = [
          t.ticketNumber,
          t.booking.bookingNumber,
          t.ticketType.name,
          t.attendeeName || t.booking.customerName,
          t.booking.customerName,
          t.attendeePhone || t.booking.customerPhone,
          t.businessName || t.booking.businessName || '',
          t.location || t.booking.location || '',
          (t.memberType || t.booking.memberType) === 'MEMBER' ? 'Member' : 'Non-Member',
          (t.foodPreference || t.booking.foodPreference) === 'NON_VEG' ? 'Non-Veg' : 'Veg',
          t.status,
          t.admissionIndex,
          t.createdAt.toISOString(),
        ];
        csvContent += row.map(sanitize).join(',') + '\n';
      }
    } else if (type === 'checkins') {
      const headers = ['Ticket Number', 'Pass Type', 'Gate', 'Staff Name', 'Result', 'Checked-in At'];
      csvContent += headers.map(sanitize).join(',') + '\n';

      const checkIns = await this.prisma.checkIn.findMany({
        where: eventId ? { eventId } : {},
        include: {
          ticket: { include: { ticketType: true } },
          gate: true,
          staffUser: true,
        },
        orderBy: { checkedInAt: 'desc' },
        take: 5000,
      });

      for (const c of checkIns) {
        const row = [
          c.ticket.ticketNumber,
          c.ticket.ticketType.name,
          c.gate?.name || 'Gate',
          c.staffUser.name,
          c.result,
          c.checkedInAt.toISOString(),
        ];
        csvContent += row.map(sanitize).join(',') + '\n';
      }
    }

    return csvContent;
  }
}
