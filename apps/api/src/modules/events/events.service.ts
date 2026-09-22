import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventStatus, TicketTypeStatus, TicketStatus, ReservationStatus } from '@prisma/client';
import { PublicEventDto, PublicTicketTypeDto } from '@cedoi/contracts';

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async getPublishedEvents(): Promise<PublicEventDto[]> {
    const events = await this.prisma.event.findMany({
      where: { status: EventStatus.PUBLISHED },
      include: {
        ticketTypes: {
          where: { status: TicketTypeStatus.ACTIVE },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { startsAt: 'asc' },
    });

    const results: PublicEventDto[] = [];
    for (const ev of events) {
      const ticketTypes = await this.calculateTicketTypesAvailability(ev.ticketTypes);
      results.push({
        id: ev.id,
        slug: ev.slug,
        name: ev.name,
        tagline: ev.tagline,
        description: ev.description,
        venue: ev.venue,
        address: ev.address,
        startsAt: ev.startsAt.toISOString(),
        endsAt: ev.endsAt.toISOString(),
        timezone: ev.timezone,
        status: ev.status as any,
        bannerUrl: ev.bannerUrl,
        ticketTypes,
      });
    }

    return results;
  }

  async getEventBySlug(slug: string): Promise<PublicEventDto> {
    let event = await this.prisma.event.findUnique({
      where: { slug },
      include: {
        ticketTypes: {
          where: { status: TicketTypeStatus.ACTIVE },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    // Fallback: If slug not found or legacy summit slug requested, load published event
    if (!event) {
      event = await this.prisma.event.findFirst({
        where: { status: EventStatus.PUBLISHED },
        include: {
          ticketTypes: {
            where: { status: TicketTypeStatus.ACTIVE },
            orderBy: { sortOrder: 'asc' },
          },
        },
        orderBy: { startsAt: 'asc' },
      });
    }

    if (!event) {
      throw new NotFoundException({
        code: 'EVENT_NOT_FOUND',
        message: `Event with slug "${slug}" not found.`,
      });
    }

    const ticketTypes = await this.calculateTicketTypesAvailability(event.ticketTypes);

    return {
      id: event.id,
      slug: event.slug,
      name: event.name,
      tagline: event.tagline,
      description: event.description,
      venue: event.venue,
      address: event.address,
      startsAt: event.startsAt.toISOString(),
      endsAt: event.endsAt.toISOString(),
      timezone: event.timezone,
      status: event.status as any,
      bannerUrl: event.bannerUrl,
      ticketTypes,
    };
  }

  async calculateTicketTypesAvailability(ticketTypes: any[]): Promise<PublicTicketTypeDto[]> {
    const now = new Date();
    const result: PublicTicketTypeDto[] = [];

    for (const tt of ticketTypes) {
      // Sold count: ACTIVE, USED, or SUSPENDED tickets
      const soldCount = await this.prisma.ticket.count({
        where: {
          ticketTypeId: tt.id,
          status: { in: [TicketStatus.ACTIVE, TicketStatus.USED, TicketStatus.SUSPENDED] },
        },
      });

      // Held count: active unexpired reservations
      const heldAgg = await this.prisma.reservationItem.aggregate({
        where: {
          ticketTypeId: tt.id,
          reservation: {
            status: ReservationStatus.HELD,
            expiresAt: { gt: now },
          },
        },
        _sum: {
          quantity: true,
        },
      });
      const heldCount = heldAgg._sum.quantity || 0;

      const remaining = Math.max(0, tt.capacity - (soldCount + heldCount));

      result.push({
        id: tt.id,
        name: tt.name,
        description: tt.description,
        unitPricePaise: tt.unitPricePaise,
        capacity: tt.capacity,
        remainingCapacity: remaining,
        maxPerBooking: tt.maxPerBooking,
        status: remaining === 0 ? TicketTypeStatus.SOLD_OUT : (tt.status as any),
      });
    }

    return result;
  }

  async getAllAdminEvents() {
    return this.prisma.event.findMany({
      include: {
        ticketTypes: {
          where: { status: TicketTypeStatus.ACTIVE },
          orderBy: { sortOrder: 'asc' },
        },
        gates: true,
        _count: {
          select: {
            bookings: true,
            checkIns: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateEvent(id: string, data: any) {
    const existing = await this.prisma.event.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException({
        code: 'EVENT_NOT_FOUND',
        message: 'Event not found.',
      });
    }

    return this.prisma.event.update({
      where: { id },
      data,
    });
  }
}
