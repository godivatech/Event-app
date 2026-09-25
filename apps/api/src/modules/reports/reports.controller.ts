import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole, BookingStatus, TicketStatus } from '@prisma/client';
import { Response } from 'express';

@Controller('v1/admin')
@UseGuards(AuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('metrics')
  async getMetrics(@Query('eventId') eventId?: string) {
    return this.reportsService.getDashboardMetrics(eventId);
  }

  @Get('bookings')
  async getBookings(
    @Query('eventId') eventId?: string,
    @Query('status') status?: BookingStatus,
    @Query('memberType') memberType?: string,
    @Query('foodPreference') foodPreference?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return this.reportsService.getAdminBookings({
      eventId,
      status,
      memberType,
      foodPreference,
      search,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Post('bookings/:bookingId/mark-paid')
  async markBookingPaid(
    @Param('bookingId') bookingId: string,
    @CurrentUser() staff: any
  ) {
    return this.reportsService.markMemberBookingPaid(bookingId, staff?.id || 'admin');
  }

  @Get('payments')
  async getPayments(
    @Query('eventId') eventId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return this.reportsService.getAdminPayments({
      eventId,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get('tickets')
  async getTickets(
    @Query('eventId') eventId?: string,
    @Query('status') status?: TicketStatus,
    @Query('memberType') memberType?: string,
    @Query('foodPreference') foodPreference?: string,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return this.reportsService.getAdminTickets({
      eventId,
      status,
      memberType,
      foodPreference,
      search,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get('check-ins')
  async getCheckIns(
    @Query('eventId') eventId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    return this.reportsService.getAdminCheckIns({
      eventId,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  @Get('audit-logs')
  async getAuditLogs(@Query('limit') limit?: string) {
    return this.reportsService.getAuditLogs(limit ? parseInt(limit, 10) : 50);
  }

  @Get('reports/:type')
  async exportReport(
    @Param('type') type: 'sales' | 'tickets' | 'checkins',
    @Query('eventId') eventId: string,
    @Res() res: Response
  ) {
    const csvData = await this.reportsService.exportCsv(type, eventId);
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `cedoi_${type}_report_${dateStr}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.send(csvData);
  }
}
