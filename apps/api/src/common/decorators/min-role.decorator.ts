import { SetMetadata } from '@nestjs/common';
import type { TeamRole } from '@riznexia/shared-types';

// Module M3 (DECISIONS.md D-023) — hierarchy-threshold role check,
// complementing @Roles()'s exact-list check. "At least this seniority"
// (e.g. @MinRole('sales_manager') admits Sales Manager/Admin/Super Admin,
// not Developer even though Developer's own hierarchy level sits between
// Sales Executive and Sales Manager — see role-hierarchy.constants.ts).
export const MIN_ROLE_KEY = 'minRole';
export const MinRole = (role: TeamRole): MethodDecorator & ClassDecorator =>
  SetMetadata(MIN_ROLE_KEY, role);
