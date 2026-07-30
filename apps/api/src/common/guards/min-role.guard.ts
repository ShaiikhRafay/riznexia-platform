import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { TeamRole } from '@riznexia/shared-types';
import type { AuthenticatedRequest } from '../../auth/types/authenticated-request';
import { MIN_ROLE_KEY } from '../decorators/min-role.decorator';
import { ForbiddenRoleException } from '../exceptions/app.exception';
import { roleMeetsMinimum } from '../rbac/role-hierarchy.constants';

// Runs after ClerkAuthGuard/RolesGuard in the request chain (Doc 16 §15,
// extended for Module M3). A route with no @MinRole() decorator is allowed
// for any authenticated employee, same no-op-when-absent pattern as
// RolesGuard.
@Injectable()
export class MinRoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const minimumRole = this.reflector.getAllAndOverride<TeamRole | undefined>(MIN_ROLE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!minimumRole) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!roleMeetsMinimum(request.user.role, minimumRole)) {
      throw new ForbiddenRoleException();
    }
    return true;
  }
}
