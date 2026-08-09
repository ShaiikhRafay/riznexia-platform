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
// Module M8.2 (DECISIONS.md D-055+) — `component:generate` follows the
// identical precedent. Same role set again.
// Module M8.3 (DECISIONS.md D-061+) — `content:bind` names the verb this
// module actually performs (binding real data, never generating), same
// dedicated-permission precedent, same role set.
// Module M8.4 (DECISIONS.md D-068+) — `website:assemble` follows the
// identical precedent one more time. Same role set again.
// Module M9 (DECISIONS.md D-075+) — `website:preview` is its own
// dedicated permission (founder's explicit instruction: do not reuse
// `website:assemble` — previewing/validating a website is a distinct
// capability from generating one, and the founder wants it independently
// assignable/revocable for future client-approval, internal-QA, and
// review-workflow features). Same role set again.
// Module M10 (DECISIONS.md D-090) — four dedicated CRM permissions, per
// the founder's explicit brief, each with a distinct real purpose:
// `crm:view` gates the new CRM read surface (stages/tasks/proposals —
// narrower than `leads:read`, since CRM operational detail is more
// sales-sensitive than the general lead directory); `crm:manage` gates
// CRM mutations (stage config, transitions, tasks, proposals, manually-
// logged activities); `crm:assign` is specifically lead-owner
// reassignment (`LeadCRM.ownerId`), split out from `crm:manage` because
// reassignment is commonly manager-only even where a rep can otherwise
// manage their own CRM data; `crm:report` gates the dashboard, same
// restricted pattern as `cost:view`.
// Module M11 (DECISIONS.md D-098) — four dedicated deployment permissions,
// per the founder's explicit brief, none reused from an earlier module:
// `deployment:view` gates every read (deployment history, status, health,
// domains); `deployment:create` gates requesting a new deployment and
// retrying a failed one (both are "start a new deployment attempt");
// `deployment:rollback` is split out from `deployment:create` — rolling
// production back is a materially different blast radius than deploying
// forward; `deployment:manage` gates domain/SSL registration and manually
// triggering a health check.
// Module M12 (DECISIONS.md D-110) — four dedicated analytics permissions,
// per the founder's explicit brief, none reused from an earlier module.
// Unlike CRM (where a rep has genuinely their-own-leads data to see),
// every M12 domain is inherently org-wide — Lead Funnel, AI Cost,
// Deployment health — the same "manager-tier visibility" class `cost:view`
// already restricts, so `sales_executive` holds none of the four.
// `analytics:view` gates every report/dashboard read; `analytics:report`
// gates a forced-refresh report run (heavier compute than the default
// cached view); `analytics:export` gates downloading a report; `analytics
// :manage` is created now, enforced on nothing yet, reserved for the
// Future Compatibility management surface (Scheduled Reports/KPI Alerts
// config) — the same "defined ahead of its first consumer" precedent as
// `team:manage`/`cost:view` at their own introduction.
export const PERMISSIONS = [
  'leads:read',
  'leads:write',
  'leads:delete',
  'discovery:read',
  'discovery:run',
  'business:analyze',
  'theme:select',
  'layout:generate',
  'component:generate',
  'content:bind',
  'website:assemble',
  'website:preview',
  'crm:view',
  'crm:manage',
  'crm:assign',
  'crm:report',
  'deployment:view',
  'deployment:create',
  'deployment:rollback',
  'deployment:manage',
  'analytics:view',
  'analytics:report',
  'analytics:export',
  'analytics:manage',
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
    'component:generate',
    'content:bind',
    'website:assemble',
    'website:preview',
    'crm:view',
    'crm:manage',
    'crm:assign',
    'crm:report',
    'deployment:view',
    'deployment:create',
    'deployment:rollback',
    'deployment:manage',
    'analytics:view',
    'analytics:report',
    'analytics:export',
    'analytics:manage',
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
    'component:generate',
    'content:bind',
    'website:assemble',
    'website:preview',
    'crm:view',
    'crm:manage',
    'crm:assign',
    'crm:report',
    'deployment:view',
    'deployment:create',
    'deployment:rollback',
    'deployment:manage',
    'analytics:view',
    'analytics:report',
    'analytics:export',
    'analytics:manage',
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
    'component:generate',
    'content:bind',
    'website:assemble',
    'website:preview',
    'crm:view',
    'crm:manage',
    'deployment:view',
    'deployment:create',
  ],
  developer: ['leads:read', 'discovery:read', 'deployment:view', 'analytics:view', 'system:debug'],
  // Strictly read-only, and deliberately excludes `cost:view` — Doc 15's
  // "only Admin/Manager" statement is a real restriction, not just a
  // default; Viewer being a catch-all read-only role doesn't override it.
  viewer: ['leads:read', 'discovery:read', 'deployment:view', 'analytics:view'],
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
