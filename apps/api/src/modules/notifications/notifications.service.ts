import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface SendNotificationParams {
  recipient: string;
  channel: 'WHATSAPP' | 'EMAIL' | 'SMS';
  type: 'BOOKING_CONFIRMATION' | 'TICKET_RECOVERY' | 'REMINDER';
  metadata?: Record<string, any>;
}

export interface NotificationProvider {
  send(params: SendNotificationParams): Promise<{ success: boolean; messageId?: string }>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Narrow extension point for Phase 8.
   * In V1, persists intent as NOT_SENT without invoking live third-party dispatchers.
   */
  async queueNotification(params: SendNotificationParams): Promise<void> {
    this.logger.log(`Queued ${params.channel} notification intent for ${params.recipient} (${params.type}) [V1 extension point]`);

    await this.prisma.notification.create({
      data: {
        recipient: params.recipient,
        channel: params.channel,
        type: params.type,
        status: 'NOT_SENT',
        metadata: params.metadata || {},
      },
    });
  }
}
