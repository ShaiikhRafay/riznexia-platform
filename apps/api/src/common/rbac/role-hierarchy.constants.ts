import type { TeamRole } from '@riznexia/shared-types';

// Module M3 (DECISIONS.md D-023). Only `super_admin`/`admin`/`sales_manager`/
// `sales_executive` are genuinely rungs on one ladder — seniority within the
// sales chain of command. `developer` is a lateral technical-access role
// (deliberately placed between `sales_manager` and `sales_executive` so a
// `@MinRole('sales_manager')` check excludes it, matching "not part of the
// sales command chain," while `@MinRole('developer')` still reads as a
// reasonable technical-or-above threshold). `viewer` is the floor — every
// role can do at least what a Viewer can. This ranking exists purely for
// "at least this seniority" (`@MinRole`) checks — it does not drive what
// specific actions a role may take; that's the independent permission
// matrix in `permission.constants.ts` (Developer having elevated hierarchy
// over Sales Executive does NOT imply Developer gets Sales Executive's
// business-data permissions — see that file).
export const ROLE_HIERARCHY: Record<TeamRole, number> = {
  super_admin: 50,
  admin: 40,
  sales_manager: 30,
  developer: 20,
  sales_executive: 10,
  viewer: 0,
};

export function roleMeetsMinimum(role: TeamRole, minimum: TeamRole): boolean {
  return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minimum];
}
