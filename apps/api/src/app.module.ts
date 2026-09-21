import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuditModule } from './modules/audit/audit.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AuthModule } from './modules/auth/auth.module';
import { EventsModule } from './modules/events/events.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { TicketsModule } from './modules/tickets/tickets.module';
import { CheckInsModule } from './modules/check-ins/check-ins.module';
import { ReportsModule } from './modules/reports/reports.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuditModule,
    JobsModule,
    NotificationsModule,
    AuthModule,
    EventsModule,
    InventoryModule,
    BookingsModule,
    PaymentsModule,
    TicketsModule,
    CheckInsModule,
    ReportsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
