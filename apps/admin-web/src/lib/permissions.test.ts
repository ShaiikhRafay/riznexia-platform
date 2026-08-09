import { describe, expect, it } from 'vitest';
import type { TeamRole } from '@riznexia/shared-types';
import { getPermissionsForRole, PERMISSIONS } from './permissions';

const ALL_ROLES: TeamRole[] = [
  'super_admin',
  'admin',
  'sales_manager',
  'developer',
  'sales_executive',
  'viewer',
];

// This table mirrors apps/api/src/common/rbac/permission.constants.ts's
// ROLE_PERMISSIONS verbatim (RBAC Alignment, DECISIONS.md D-122) — these
// tests exist to catch drift between the two copies, not to re-derive the
// backend's own authorization logic.
describe('getPermissionsForRole', () => {
  it('grants super_admin every permission unconditionally', () => {
    expect(getPermissionsForRole('super_admin')).toEqual(PERMISSIONS);
  });

  it('never returns permissions outside the closed PERMISSIONS taxonomy, for any role', () => {
    for (const role of ALL_ROLES) {
      for (const permission of getPermissionsForRole(role)) {
        expect(PERMISSIONS).toContain(permission);
      }
    }
  });

  it('grants admin and sales_manager an identical permission set, except system:debug', () => {
    const admin = new Set(getPermissionsForRole('admin'));
    const salesManager = new Set(getPermissionsForRole('sales_manager'));
    admin.delete('system:debug');
    expect(admin).toEqual(salesManager);
  });

  it('excludes sales_executive from every org-wide-visibility permission', () => {
    const permissions = getPermissionsForRole('sales_executive');
    for (const restricted of [
      'crm:assign',
      'crm:report',
      'deployment:rollback',
      'deployment:manage',
      'analytics:view',
      'cost:view',
      'team:manage',
    ] as const) {
      expect(permissions).not.toContain(restricted);
    }
  });

  it('gives developer and viewer an identical read-only slice, except system:debug', () => {
    const developer = new Set(getPermissionsForRole('developer'));
    const viewer = new Set(getPermissionsForRole('viewer'));
    developer.delete('system:debug');
    expect(developer).toEqual(viewer);
  });

  it('viewer holds no write/mutate permission anywhere', () => {
    const permissions = getPermissionsForRole('viewer');
    for (const permission of permissions) {
      expect(permission.endsWith(':read') || permission.endsWith(':view')).toBe(true);
    }
  });
});
