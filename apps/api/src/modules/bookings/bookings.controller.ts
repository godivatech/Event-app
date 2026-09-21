import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { GuestSessionGuard } from '../../common/guards/guest-session.guard';
import { GuestSessionToken } from '../../common/decorators/guest-session.decorator';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { Request } from 'express';
import { CreateReservationDto } from '@cedoi/contracts';

import { PrismaService } from '../../prisma/prisma.service';
import { CryptoUtil } from '../../common/crypto/crypto.util';

@Controller('v1/bookings')
export class BookingsController {
  constructor(
    private readonly bookingsService: BookingsService,
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

  @Post('reserve')
  @UseGuards(GuestSessionGuard)
  @HttpCode(HttpStatus.CREATED)
  async reserve(
    @Body() dto: CreateReservationDto,
    @GuestSessionToken() guestToken: string,
    @Req() req: Request
  ) {
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
    return this.bookingsService.createReservation(dto, guestToken, ipAddress);
  }

  @Get(':bookingNumber')
  @UseGuards(GuestSessionGuard)
  async getBooking(
    @Param('bookingNumber') bookingNumber: string,
    @GuestSessionToken() guestToken: string,
    @Req() req: Request
  ) {
    const staffUser = await this.resolveStaffUser(req);
    return this.bookingsService.getBookingByNumber(bookingNumber, guestToken, staffUser);
  }

  @Post('recover')
  @UseGuards(GuestSessionGuard)
  @HttpCode(HttpStatus.OK)
  async recover(
    @Body() body: { bookingNumber: string; recoveryCode: string },
    @GuestSessionToken() guestToken: string,
    @Req() req: Request
  ) {
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
    return this.bookingsService.recoverBookingByCode(
      body.bookingNumber,
      body.recoveryCode,
      guestToken,
      ipAddress
    );
  }

  @Post('admin/:bookingNumber/assist-recovery')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async assistRecovery(
    @Param('bookingNumber') bookingNumber: string,
    @Body('reason') reason: string,
    @CurrentUser() staff: any,
    @Req() req: Request
  ) {
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
    return this.bookingsService.staffAssistedRecovery(
      bookingNumber,
      staff.id,
      reason,
      ipAddress
    );
  }
}
