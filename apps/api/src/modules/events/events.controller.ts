import {
  Controller,
  Get,
  Put,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { EventsService } from './events.service';
import { AuthGuard } from '../../common/guards/auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('v1/events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  async getPublishedEvents() {
    return this.eventsService.getPublishedEvents();
  }

  @Get(':slug')
  async getEventBySlug(@Param('slug') slug: string) {
    return this.eventsService.getEventBySlug(slug);
  }

  @Get('admin/all')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async getAdminEvents() {
    return this.eventsService.getAllAdminEvents();
  }

  @Put('admin/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  async updateEvent(@Param('id') id: string, @Body() body: any) {
    return this.eventsService.updateEvent(id, body);
  }
}
