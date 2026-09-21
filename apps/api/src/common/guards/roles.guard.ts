import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user) {
      throw new ForbiddenException({
        code: 'FORBIDDEN',
        message: 'No authenticated user identity found for role evaluation.',
      });
    }

    // Role hierarchy: SUPER_ADMIN can do anything
    if (user.role === UserRole.SUPER_ADMIN) {
      return true;
    }

    // ADMIN can perform ADMIN and SCANNER actions
    if (user.role === UserRole.ADMIN && (requiredRoles.includes(UserRole.ADMIN) || requiredRoles.includes(UserRole.SCANNER))) {
      return true;
    }

    // Direct match
    if (requiredRoles.includes(user.role)) {
      return true;
    }

    throw new ForbiddenException({
      code: 'INSUFFICIENT_PERMISSIONS',
      message: `Your role (${user.role}) does not have permission to perform this action.`,
    });
  }
}
