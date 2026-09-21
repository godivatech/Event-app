import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CryptoUtil } from '../crypto/crypto.util';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Check cookie first, then Bearer token
    let rawToken: string | undefined = request.cookies?.['cedoi_staff_session'];
    if (!rawToken) {
      const authHeader = request.headers['authorization'];
      if (authHeader && authHeader.startsWith('Bearer ')) {
        rawToken = authHeader.slice(7).trim();
      }
    }

    if (!rawToken) {
      throw new UnauthorizedException({
        code: 'UNAUTHENTICATED',
        message: 'Authentication required. Please log in to proceed.',
      });
    }

    const tokenHash = CryptoUtil.sha256(rawToken);

    const session = await this.prisma.session.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            assignments: true,
          },
        },
      },
    });

    if (!session) {
      throw new UnauthorizedException({
        code: 'SESSION_INVALID',
        message: 'Session is invalid or has expired.',
      });
    }

    if (session.expiresAt < new Date()) {
      await this.prisma.session.delete({ where: { id: session.id } }).catch(() => {});
      throw new UnauthorizedException({
        code: 'SESSION_EXPIRED',
        message: 'Session has expired. Please log in again.',
      });
    }

    if (!session.user.isActive) {
      throw new UnauthorizedException({
        code: 'USER_DEACTIVATED',
        message: 'Your account is deactivated. Contact an administrator.',
      });
    }

    // Attach authenticated user to request
    request.user = {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role,
      assignments: session.user.assignments,
      sessionId: session.id,
    };

    return true;
  }
}
