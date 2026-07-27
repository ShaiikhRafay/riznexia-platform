import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { TeamRole } from '@riznexia/shared-types';
import type { AuthenticatedRequest } from '../../auth/types/authenticated-request';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { ForbiddenRoleException } from '../exceptions/app.exception';

// Second link in the request chain (Doc 16 §15) — runs after ClerkAuthGuard,
// so `request.user` is always populated here. A route with no @Roles()
// decorator is allowed for any authenticated employee (Doc 12 §2).
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<TeamRole[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!requiredRoles.includes(request.user.role)) {
      throw new ForbiddenRoleException();
    }
    return true;
  }
}
