import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { InventoryModule } from '../inventory/inventory.module';
import { TicketsModule } from '../tickets/tickets.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [InventoryModule, TicketsModule, AuthModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
