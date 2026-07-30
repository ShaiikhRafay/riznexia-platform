import type { TeamRole } from '@riznexia/shared-types';

// Module M3 (DECISIONS.md D-023). Fine-grained, resource:action permissions —
// independent of role hierarchy (role-hierarchy.constants.ts). A role's
// permission set is assigned explicitly per role below, not inherited
// automatically from the hierarchy, because seniority and permission scope
// don't always move together here (Developer outranks Sales Executive
// hierarchically but has none of its lead-management permissions).
//
// Several of these (`team:manage`, `cost:view`) aren't enforced on any
// route yet — no endpoint exists to enforce them on until Module M4 (Lead
// Management APIs), the Team & Settings backlog item, or M12 (Analytics &
// Reporting) build one. Defined now, alongside the roles, so the contract
// doesn't shift later — same rationale as Doc 19's request/response schemas
// being defined ahead of every endpoint that will use them.
// Module M6 (DECISIONS.md D-043) — `business:analyze` is a dedicated
// permission, not a reuse of `leads:write`: an AI analysis call is a
// real, cost-bearing operation (like `discovery:run`/Places API spend),
// and the founder wants it independently assignable/revocable ahead of
// future usage-limit/billing/quota features. Granted to the same role set
// as `discovery:run` — both spend real per-call budget — not to Developer
// or Viewer.
// Module M7 (DECISIONS.md D-047) — `theme:select` is also a dedicated
// permission, not a reuse of `business:analyze`: the founder was explicit
// that theme selection is its own independent business capability (named
// future extensions — premium themes, a theme marketplace, manual
// override, an approval workflow, agency-specific themes — all want their
// own permission boundary distinct from AI business analysis). Granted to
// the same role set as `business:analyze`/`discovery:run`.
// Module M8.1 (DECISIONS.md D-050+) — `layout:generate` follows the same
// dedicated-permission precedent as `theme:select`: a real, independently-
// assignable capability, not folded into `theme:select`. Same role set.
export const PERMISSIONS = [
  'leads:read',
  'leads:write',
  'leads:delete',
  'discovery:read',
  'discovery:run',
  'business:analyze',
  'theme:select',
  'layout:generate',
  'team:manage',
  'cost:view',
  'system:debug',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

// Doc 15 §"AuthZ" already stated the intent this codifies: "only Admin/
// Manager can manage team accounts or view the cost dashboard" — carried
// forward here as Admin/Sales Manager owning `team:manage`/`cost:view`.
const ROLE_PERMISSIONS: Record<TeamRole, readonly Permission[]> = {
  super_admin: PERMISSIONS, // everything, unconditionally
  admin: [
    'leads:read',
    'leads:write',
    'leads:delete',
    'discovery:read',
    'discovery:run',
    'business:analyze',
    'theme:select',
    'layout:generate',
    'team:manage',
    'cost:view',
    'system:debug',
  ],
  sales_manager: [
    'leads:read',
    'leads:write',
    'leads:delete',
    'discovery:read',
    'discovery:run',
    'business:analyze',
    'theme:select',
    'layout:generate',
    'team:manage',
    'cost:view',
  ],
  sales_executive: [
    'leads:read',
    'leads:write',
    'discovery:read',
    'discovery:run',
    'business:analyze',
    'theme:select',
    'layout:generate',
  ],
  developer: ['leads:read', 'discovery:read', 'system:debug'],
  // Strictly read-only, and deliberately excludes `cost:view` — Doc 15's
  // "only Admin/Manager" statement is a real restriction, not just a
  // default; Viewer being a catch-all read-only role doesn't override it.
  viewer: ['leads:read', 'discovery:read'],
};

export function getPermissionsForRole(role: TeamRole): readonly Permission[] {
  return ROLE_PERMISSIONS[role];
}

export function roleHasPermission(role: TeamRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function roleHasEveryPermission(
  role: TeamRole,
  permissions: readonly Permission[],
): boolean {
  return permissions.every((permission) => roleHasPermission(role, permission));
}
