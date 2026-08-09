import type { TeamRole } from '@riznexia/shared-types';

// RBAC Alignment (post-F1) — mirrors the backend's closed permission
// taxonomy and role grants (apps/api/src/common/rbac/permission.constants.ts,
// DECISIONS.md D-023/D-090/D-098/D-110) verbatim, as static presentation
// data only. This is NOT a re-implementation of authorization: no request
// this app makes is ever decided by this file — the backend's own guards
// independently check every call, unchanged. This file exists solely so
// nav visibility, route guards, and component rendering have something
// permission-shaped to check instead of a role, without adding a second
// API call or hand-rolling a role check inside a component (see
// DECISIONS.md D-122 for why this supersedes D-116's coarser per-nav-item
// role list).
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

const ROLE_PERMISSIONS: Record<TeamRole, readonly Permission[]> = {
  super_admin: PERMISSIONS,
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
  viewer: ['leads:read', 'discovery:read', 'deployment:view', 'analytics:view'],
};

export function getPermissionsForRole(role: TeamRole): readonly Permission[] {
  return ROLE_PERMISSIONS[role];
}
