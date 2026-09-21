import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface AuditLogParams {
  actorId?: string;
  actorType: 'STAFF' | 'CUSTOMER' | 'SYSTEM' | 'SCANNER';
  action: string;
  entityType: 'EVENT' | 'BOOKING' | 'PAYMENT' | 'REFUND' | 'TICKET' | 'CHECK_IN' | 'USER' | 'SETTINGS';
  entityId?: string;
  eventId?: string;
  requestId?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(params: AuditLogParams): Promise<void> {
    try {
      // Redact sensitive keys if any accidentally passed in metadata
      const sanitizedMetadata = this.sanitizeMetadata(params.metadata);

      await this.prisma.auditLog.create({
        data: {
          actorId: params.actorId,
          actorType: params.actorType,
          action: params.action,
          entityType: params.entityType,
          entityId: params.entityId,
          eventId: params.eventId,
          requestId: params.requestId,
          metadata: sanitizedMetadata,
          ipAddress: params.ipAddress,
        },
      });
    } catch (err: any) {
      this.logger.error(`Failed to record audit log: ${err.message}`, err.stack);
    }
  }

  private sanitizeMetadata(metadata?: Record<string, any>): Record<string, any> | undefined {
    if (!metadata) return undefined;
    const sensitiveKeys = ['password', 'passwordHash', 'token', 'recoveryCode', 'secret', 'key', 'rawQrToken'];
    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(metadata)) {
      if (sensitiveKeys.some((s) => key.toLowerCase().includes(s.toLowerCase()))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        sanitized[key] = this.sanitizeMetadata(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }
}
