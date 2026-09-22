import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CheckInsService } from './check-ins.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { CheckInRequestDto } from '@cedoi/contracts';
import { Request } from 'express';

@Controller('v1/check-in')
@UseGuards(AuthGuard, RolesGuard)
export class CheckInsController {
  constructor(private readonly checkInsService: CheckInsService) {}

  @Post()
  @Roles(UserRole.SCANNER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  async checkIn(
    @Body() dto: CheckInRequestDto,
    @CurrentUser() staff: any,
    @Req() req: Request
  ) {
    const ipAddress = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress;
    return this.checkInsService.checkIn(dto, staff.id, ipAddress);
  }

  @Get('history')
  @Roles(UserRole.SCANNER, UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getHistory(
    @Query('eventId') eventId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
    @CurrentUser() staff: any
  ) {
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    return this.checkInsService.getScannerHistory(staff.id, eventId, pageNum, limitNum);
  }
}
