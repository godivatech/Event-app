import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OutboxJobType, OutboxJobStatus, Prisma } from '@prisma/client';
import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';

@Injectable()
export class OutboxService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxService.name);
  private redisClient: Redis | null = null;
  private jobQueue: Queue | null = null;
  private jobWorker: Worker | null = null;
  private sweeperInterval: NodeJS.Timeout | null = null;
  private isProcessing = false;

  // Handlers registered by other modules (PDF, Expiry, Reconciliation)
  private handlers = new Map<OutboxJobType, (payload: any) => Promise<void>>();

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.initBullMQ();
    // Start local durable outbox sweeper (runs every 5 seconds)
    this.sweeperInterval = setInterval(() => {
      this.processOutboxBatch().catch((err) => {
        this.logger.error(`Error in outbox sweeper: ${err.message}`);
      });
    }, 5000);
  }

  async onModuleDestroy() {
    if (this.sweeperInterval) {
      clearInterval(this.sweeperInterval);
    }
    if (this.jobWorker) {
      await this.jobWorker.close();
    }
    if (this.jobQueue) {
      await this.jobQueue.close();
    }
    if (this.redisClient) {
      await this.redisClient.quit();
    }
  }

  registerHandler(type: OutboxJobType, handler: (payload: any) => Promise<void>) {
    this.handlers.set(type, handler);
  }

  private async initBullMQ() {
    const redisUrl = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
    try {
      this.redisClient = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        connectTimeout: 1000,
        lazyConnect: true,
        enableOfflineQueue: false,
        retryStrategy: () => null,
      });

      this.redisClient.on('error', () => {
        // Suppress unhandled event emitter warnings when Redis is not running locally
      });

      await this.redisClient.connect();
      this.logger.log(`Connected to Redis at ${redisUrl} for BullMQ jobs.`);

      this.jobQueue = new Queue('cedoi-jobs', { connection: this.redisClient });
      this.jobWorker = new Worker(
        'cedoi-jobs',
        async (job: Job) => {
          await this.executeJob(job.data.jobId);
        },
        { connection: this.redisClient }
      );
    } catch (err: any) {
      this.logger.warn(
        `Redis not reachable (${err.message}). Using PostgreSQL Transactional Outbox sweeper for resilient local background processing.`
      );
      if (this.redisClient) {
        try {
          this.redisClient.disconnect();
        } catch (e) {
          // ignore
        }
        this.redisClient = null;
      }
      this.jobQueue = null;
      this.jobWorker = null;
    }
  }

  /**
   * Enqueues a job atomically inside a transaction or standalone.
   */
  async enqueueJob(
    jobType: OutboxJobType,
    payload: Record<string, any>,
    tx?: Prisma.TransactionClient,
    scheduledAt: Date = new Date()
  ) {
    const db = tx || this.prisma;
    const outboxRecord = await db.outboxJob.create({
      data: {
        jobType,
        payload,
        status: OutboxJobStatus.PENDING,
        scheduledAt,
      },
    });

    // If BullMQ is active and scheduled for now, queue immediately
    if (this.jobQueue && scheduledAt.getTime() <= Date.now()) {
      try {
        await this.jobQueue.add(jobType, { jobId: outboxRecord.id }, { jobId: outboxRecord.id });
      } catch (err: any) {
        this.logger.warn(`Failed to dispatch to BullMQ; will be picked up by durable DB sweeper: ${err.message}`);
      }
    }

    return outboxRecord;
  }

  /**
   * Durable sweeper picks up pending jobs that are due.
   */
  async processOutboxBatch(batchSize: number = 10) {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const now = new Date();
      const jobs = await this.prisma.outboxJob.findMany({
        where: {
          status: OutboxJobStatus.PENDING,
          scheduledAt: { lte: now },
        },
        orderBy: { scheduledAt: 'asc' },
        take: batchSize,
      });

      for (const job of jobs) {
        await this.executeJob(job.id);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async executeJob(jobId: string) {
    // Acquire row with status = PENDING to prevent concurrent execution
    const updated = await this.prisma.outboxJob.updateMany({
      where: {
        id: jobId,
        status: OutboxJobStatus.PENDING,
      },
      data: {
        status: OutboxJobStatus.PROCESSING,
      },
    });

    if (updated.count === 0) {
      return; // Already picked up by another worker
    }

    const job = await this.prisma.outboxJob.findUnique({ where: { id: jobId } });
    if (!job) return;

    const handler = this.handlers.get(job.jobType);
    if (!handler) {
      this.logger.error(`No handler registered for job type: ${job.jobType}`);
      await this.prisma.outboxJob.update({
        where: { id: jobId },
        data: {
          status: OutboxJobStatus.FAILED,
          lastError: `No handler registered for ${job.jobType}`,
          processedAt: new Date(),
        },
      });
      return;
    }

    try {
      await handler(job.payload);

      await this.prisma.outboxJob.update({
        where: { id: jobId },
        data: {
          status: OutboxJobStatus.COMPLETED,
          processedAt: new Date(),
          lastError: null,
        },
      });
    } catch (err: any) {
      const newRetryCount = job.retryCount + 1;
      const willRetry = newRetryCount < job.maxRetries;

      this.logger.error(`Job [${jobId}] failed: ${err.message}`, err.stack);

      await this.prisma.outboxJob.update({
        where: { id: jobId },
        data: {
          retryCount: newRetryCount,
          status: willRetry ? OutboxJobStatus.PENDING : OutboxJobStatus.FAILED,
          lastError: err.message || 'Unknown error',
          // Exponential backoff: 5s, 10s, 20s, 40s...
          scheduledAt: willRetry
            ? new Date(Date.now() + Math.pow(2, newRetryCount) * 2500)
            : job.scheduledAt,
          processedAt: willRetry ? null : new Date(),
        },
      });
    }
  }
}
