import {
  Injectable,
  CanActivate,
  ExecutionContext,
} from '@nestjs/common';
import { CryptoUtil } from '../crypto/crypto.util';

@Injectable()
export class GuestSessionGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Check for existing guest cookie or header
    let guestToken: string | undefined = request.cookies?.['cedoi_guest_session'];
    if (!guestToken) {
      guestToken = request.headers['x-guest-session'] as string | undefined;
    }

    if (!guestToken) {
      // Generate a new 256-bit cryptographically random guest session token
      guestToken = CryptoUtil.generateSecureToken(32);

      // Set HttpOnly cookie on response
      response.cookie('cedoi_guest_session', guestToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/',
      });
    }

    request.guestSessionToken = guestToken;
    return true;
  }
}
