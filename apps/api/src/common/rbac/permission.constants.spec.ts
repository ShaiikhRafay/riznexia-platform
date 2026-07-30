import { TEAM_ROLES } from '@riznexia/shared-types';
import {
  PERMISSIONS,
  getPermissionsForRole,
  roleHasEveryPermission,
  roleHasPermission,
} from './permission.constants';

describe('permission.constants', () => {
  it('assigns a (possibly empty) permission set to every role', () => {
    for (const role of TEAM_ROLES) {
      expect(Array.isArray(getPermissionsForRole(role))).toBe(true);
    }
  });

  it('grants super_admin every defined permission', () => {
    for (const permission of PERMISSIONS) {
      expect(roleHasPermission('super_admin', permission)).toBe(true);
    }
  });

  it('restricts cost:view to admin and sales_manager only (Doc 15 §"AuthZ")', () => {
    const rolesWithCostView = TEAM_ROLES.filter((role) => roleHasPermission(role, 'cost:view'));
    expect(rolesWithCostView.sort()).toEqual(['admin', 'sales_manager', 'super_admin'].sort());
  });

  it('restricts team:manage to admin and sales_manager only (Doc 15 §"AuthZ")', () => {
    const rolesWithTeamManage = TEAM_ROLES.filter((role) => roleHasPermission(role, 'team:manage'));
    expect(rolesWithTeamManage.sort()).toEqual(['admin', 'sales_manager', 'super_admin'].sort());
  });

  it('gives every role at least leads:read', () => {
    for (const role of TEAM_ROLES) {
      expect(roleHasPermission(role, 'leads:read')).toBe(true);
    }
  });

  it('does not give viewer any write/delete/run permission', () => {
    expect(roleHasPermission('viewer', 'leads:write')).toBe(false);
    expect(roleHasPermission('viewer', 'leads:delete')).toBe(false);
    expect(roleHasPermission('viewer', 'discovery:run')).toBe(false);
    expect(roleHasPermission('viewer', 'business:analyze')).toBe(false);
    expect(roleHasPermission('viewer', 'theme:select')).toBe(false);
  });

  // Module M6 (DECISIONS.md D-043) — business:analyze is granted to the
  // same role set as discovery:run (both spend real per-call budget), not
  // to Developer or Viewer.
  it('grants business:analyze to the same roles as discovery:run', () => {
    const rolesWithDiscoveryRun = TEAM_ROLES.filter((role) =>
      roleHasPermission(role, 'discovery:run'),
    );
    const rolesWithBusinessAnalyze = TEAM_ROLES.filter((role) =>
      roleHasPermission(role, 'business:analyze'),
    );
    expect(rolesWithBusinessAnalyze.sort()).toEqual(rolesWithDiscoveryRun.sort());
  });

  // Module M7 (DECISIONS.md D-047) — theme:select is its own dedicated
  // permission, granted to the same role set as business:analyze/
  // discovery:run, not merged into either.
  it('grants theme:select to the same roles as business:analyze', () => {
    const rolesWithBusinessAnalyze = TEAM_ROLES.filter((role) =>
      roleHasPermission(role, 'business:analyze'),
    );
    const rolesWithThemeSelect = TEAM_ROLES.filter((role) =>
      roleHasPermission(role, 'theme:select'),
    );
    expect(rolesWithThemeSelect.sort()).toEqual(rolesWithBusinessAnalyze.sort());
  });

  it('gives developer system:debug but not lead-mutation permissions', () => {
    expect(roleHasPermission('developer', 'system:debug')).toBe(true);
    expect(roleHasPermission('developer', 'leads:write')).toBe(false);
    expect(roleHasPermission('developer', 'leads:delete')).toBe(false);
  });

  describe('roleHasEveryPermission', () => {
    it('returns true only when every requested permission is present', () => {
      expect(roleHasEveryPermission('sales_executive', ['leads:read', 'discovery:run'])).toBe(true);
      expect(roleHasEveryPermission('sales_executive', ['leads:read', 'leads:delete'])).toBe(false);
    });

    it('returns true for an empty permission list', () => {
      expect(roleHasEveryPermission('viewer', [])).toBe(true);
    });
  });
});
