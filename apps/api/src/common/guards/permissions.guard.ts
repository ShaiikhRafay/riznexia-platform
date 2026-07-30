import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthenticatedRequest } from '../../auth/types/authenticated-request';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { ForbiddenPermissionException } from '../exceptions/app.exception';
import type { Permission } from '../rbac/permission.constants';
import { roleHasEveryPermission } from '../rbac/permission.constants';

// Last link in the request chain (Doc 16 §15, extended for Module M3):
// ClerkAuthGuard (authenticate) -> RolesGuard (exact role list) ->
// MinRoleGuard (hierarchy threshold) -> PermissionsGuard (fine-grained
// permission check). A route with no @RequirePermissions() decorator is
// allowed for any authenticated employee — same no-op-when-absent pattern
// as the other two role guards.
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[] | undefined>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (!roleHasEveryPermission(request.user.role, requiredPermissions)) {
      throw new ForbiddenPermissionException();
    }
    return true;
  }
}
