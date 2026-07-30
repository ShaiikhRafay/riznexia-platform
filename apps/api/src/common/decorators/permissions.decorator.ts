import { SetMetadata } from '@nestjs/common';
import type { Permission } from '../rbac/permission.constants';

// Module M3 (DECISIONS.md D-023) — fine-grained permission check,
// independent of @Roles()/@MinRole(). Declares which permissions a route
// requires; PermissionsGuard resolves them from the caller's role via the
// matrix in rbac/permission.constants.ts.
export const PERMISSIONS_KEY = 'permissions';
export const RequirePermissions = (
  ...permissions: Permission[]
): MethodDecorator & ClassDecorator => SetMetadata(PERMISSIONS_KEY, permissions);
