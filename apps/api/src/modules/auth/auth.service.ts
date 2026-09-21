import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CryptoUtil } from '../../common/crypto/crypto.util';
import { AuditService } from '../audit/audit.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  async login(
    email: string,
    pass: string,
    userAgent?: string,
    ipAddress?: string
  ) {
    if (!email || !pass) {
      throw new BadRequestException({
        code: 'CREDENTIALS_REQUIRED',
        message: 'Email and password are required.',
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        assignments: {
          include: {
            gate: true,
          },
        },
      },
    });

    if (!user) {
      this.logger.warn(`Failed login attempt for non-existent email: ${normalizedEmail}`);
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password.',
      });
    }

    if (!user.isActive) {
      throw new UnauthorizedException({
        code: 'ACCOUNT_DEACTIVATED',
        message: 'Your account has been deactivated. Please contact support.',
      });
    }

    const isValidPassword = await bcrypt.compare(pass, user.passwordHash);
    if (!isValidPassword) {
      this.logger.warn(`Invalid password for user: ${normalizedEmail}`);
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password.',
      });
    }

    // Generate session token (256-bit entropy)
    const rawToken = CryptoUtil.generateSecureToken(32);
    const tokenHash = CryptoUtil.sha256(rawToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await this.prisma.session.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
        userAgent,
        ipAddress,
      },
    });

    await this.audit.log({
      actorId: user.id,
      actorType: 'STAFF',
      action: 'LOGIN_SUCCESS',
      entityType: 'USER',
      entityId: user.id,
      ipAddress,
      metadata: { email: user.email, role: user.role },
    });

    return {
      token: rawToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        assignments: user.assignments.map((a) => ({
          eventId: a.eventId,
          gateId: a.gateId,
          gateName: a.gate?.name,
          gateCode: a.gate?.code,
          role: a.role,
        })),
      },
    };
  }

  async logout(rawToken: string, userId?: string, ipAddress?: string) {
    if (rawToken) {
      const tokenHash = CryptoUtil.sha256(rawToken);
      await this.prisma.session.deleteMany({ where: { tokenHash } }).catch(() => {});
    }

    if (userId) {
      await this.audit.log({
        actorId: userId,
        actorType: 'STAFF',
        action: 'LOGOUT',
        entityType: 'USER',
        entityId: userId,
        ipAddress,
      });
    }

    return { message: 'Logged out successfully' };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        assignments: {
          include: {
            gate: true,
          },
        },
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException({
        code: 'USER_NOT_FOUND',
        message: 'User account not found or deactivated.',
      });
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      assignments: user.assignments.map((a) => ({
        eventId: a.eventId,
        gateId: a.gateId,
        gateName: a.gate?.name,
        gateCode: a.gate?.code,
        role: a.role,
      })),
    };
  }
}
