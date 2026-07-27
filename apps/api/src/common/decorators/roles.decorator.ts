import { SetMetadata } from '@nestjs/common';
import type { TeamRole } from '@riznexia/shared-types';

// Declares which roles may call a route. Absence of this decorator means
// "any authenticated employee" — RolesGuard only restricts when roles are
// explicitly listed (Doc 12 §2: role checks are centralized, not ad hoc
// `if` statements inside handlers).
export const ROLES_KEY = 'roles';
export const Roles = (...roles: TeamRole[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);
