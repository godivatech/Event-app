import {
  Controller,
  Get,
  Param,
  Res,
  Req,
  UseGuards,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { PrismaService } from '../../prisma/prisma.service';
import { GuestSessionGuard } from '../../common/guards/guest-session.guard';
import { GuestSessionToken } from '../../common/decorators/guest-session.decorator';
import { CryptoUtil } from '../../common/crypto/crypto.util';
import { Request, Response } from 'express';
import * as fs from 'fs';

@Controller('v1/tickets')
export class TicketsController {
  constructor(
    private readonly ticketsService: TicketsService,
    private readonly prisma: PrismaService
  ) {}

  private async resolveStaffUser(req: Request) {
    let staffUser = (req as any).user;
    if (staffUser) return staffUser;

    let rawToken: string | undefined = req.cookies?.['cedoi_staff_session'];
    if (!rawToken) {
      const authHeader = req.headers['authorization'];
      if (authHeader && authHeader.startsWith('Bearer ')) {
        rawToken = authHeader.slice(7).trim();
      }
    }

    if (!rawToken) return null;

    const tokenHash = CryptoUtil.sha256(rawToken);
    const session = await this.prisma.session.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (session && session.expiresAt > new Date()) {
      return session.user;
    }
    return null;
  }

  @Get(':bookingNumber')
  @UseGuards(GuestSessionGuard)
  async getTickets(
    @Param('bookingNumber') bookingNumber: string,
    @GuestSessionToken() guestToken: string,
    @Req() req: Request
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { bookingNumber },
      include: {
        accessSessions: true,
        event: true,
        tickets: {
          include: { ticketType: true },
          orderBy: { admissionIndex: 'asc' },
        },
      },
    });

    if (!booking) {
      throw new NotFoundException({
        code: 'BOOKING_NOT_FOUND',
        message: 'Booking not found.',
      });
    }

    // Verify authorization
    const staffUser = await this.resolveStaffUser(req);
    let isAuthorized = false;

    if (staffUser && (staffUser.role === 'ADMIN' || staffUser.role === 'SUPER_ADMIN')) {
      isAuthorized = true;
    } else if (guestToken) {
      const guestHash = CryptoUtil.sha256(guestToken);
      if (
        booking.guestSessionTokenHash === guestHash ||
        booking.accessSessions.some((s) => s.tokenHash === guestHash && s.expiresAt > new Date())
      ) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED_TICKET_ACCESS',
        message: 'You are not authorized to view these tickets. Please enter your recovery code.',
      });
    }

    return {
      bookingNumber: booking.bookingNumber,
      eventName: booking.event.name,
      venue: booking.event.venue,
      startsAt: booking.event.startsAt,
      tickets: booking.tickets.map((t) => ({
        id: t.id,
        ticketNumber: t.ticketNumber,
        ticketTypeName: t.ticketType.name,
        admissionIndex: t.admissionIndex,
        status: t.status,
        qrCredential: t.qrCredentialHash,
      })),
    };
  }

  @Get(':bookingNumber/pdf')
  @UseGuards(GuestSessionGuard)
  async downloadPdf(
    @Param('bookingNumber') bookingNumber: string,
    @GuestSessionToken() guestToken: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    const booking = await this.prisma.booking.findUnique({
      where: { bookingNumber },
      include: { accessSessions: true },
    });

    if (!booking) {
      throw new NotFoundException({
        code: 'BOOKING_NOT_FOUND',
        message: 'Booking not found.',
      });
    }

    const staffUser = await this.resolveStaffUser(req);
    let isAuthorized = false;

    if (staffUser && (staffUser.role === 'ADMIN' || staffUser.role === 'SUPER_ADMIN')) {
      isAuthorized = true;
    } else if (guestToken) {
      const guestHash = CryptoUtil.sha256(guestToken);
      if (
        booking.guestSessionTokenHash === guestHash ||
        booking.accessSessions.some((s) => s.tokenHash === guestHash && s.expiresAt > new Date())
      ) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      throw new UnauthorizedException({
        code: 'UNAUTHORIZED_PDF_DOWNLOAD',
        message: 'Unauthorized to download tickets.',
      });
    }

    const { filePath, fileName } = await this.ticketsService.getPdfFilePath(bookingNumber);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  }
}
