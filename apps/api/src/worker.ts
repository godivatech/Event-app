import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { OutboxService } from './modules/jobs/outbox.service';
import { InventoryService } from './modules/inventory/inventory.service';

async function bootstrapWorker() {
  const logger = new Logger('Worker');
  logger.log('👷 Starting CEDOI Background Worker process...');

  const app = await NestFactory.createApplicationContext(AppModule);
  const outbox = app.get(OutboxService);
  const inventory = app.get(InventoryService);

  // Periodic sweeper for reservation expiry (runs every 10 seconds)
  setInterval(async () => {
    try {
      await inventory.expireStaleReservations();
    } catch (err: any) {
      logger.error(`Error in inventory expiry worker: ${err.message}`);
    }
  }, 10000);

  // Periodic sweeper for pending outbox jobs
  setInterval(async () => {
    try {
      await outbox.processOutboxBatch(20);
    } catch (err: any) {
      logger.error(`Error in outbox processing worker: ${err.message}`);
    }
  }, 5000);

  logger.log('✅ Background worker active and monitoring durable outbox queue.');
}

bootstrapWorker();
