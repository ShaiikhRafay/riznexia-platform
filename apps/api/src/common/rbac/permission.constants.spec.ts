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

  // Module M9 (DECISIONS.md D-075) — website:preview is its own dedicated
  // permission, not a reuse of website:assemble, but granted to the same
  // role set.
  it('grants website:preview to the same roles as website:assemble', () => {
    const rolesWithAssemble = TEAM_ROLES.filter((role) =>
      roleHasPermission(role, 'website:assemble'),
    );
    const rolesWithPreview = TEAM_ROLES.filter((role) =>
      roleHasPermission(role, 'website:preview'),
    );
    expect(rolesWithPreview.sort()).toEqual(rolesWithAssemble.sort());
  });

  // Module M10 (DECISIONS.md D-090) — four distinct CRM permissions.
  // crm:view/crm:manage go to every role that already touches leads
  // operationally (incl. sales_executive); crm:assign/crm:report are
  // manager-and-up only, restricted like team:manage/cost:view.
  it('grants crm:view and crm:manage to sales_executive, but not crm:assign or crm:report', () => {
    expect(roleHasPermission('sales_executive', 'crm:view')).toBe(true);
    expect(roleHasPermission('sales_executive', 'crm:manage')).toBe(true);
    expect(roleHasPermission('sales_executive', 'crm:assign')).toBe(false);
    expect(roleHasPermission('sales_executive', 'crm:report')).toBe(false);
  });

  it('restricts crm:assign and crm:report to admin/sales_manager/super_admin, same as cost:view', () => {
    const rolesWithCostView = TEAM_ROLES.filter((role) => roleHasPermission(role, 'cost:view'));
    const rolesWithCrmAssign = TEAM_ROLES.filter((role) => roleHasPermission(role, 'crm:assign'));
    const rolesWithCrmReport = TEAM_ROLES.filter((role) => roleHasPermission(role, 'crm:report'));
    expect(rolesWithCrmAssign.sort()).toEqual(rolesWithCostView.sort());
    expect(rolesWithCrmReport.sort()).toEqual(rolesWithCostView.sort());
  });

  it('does not give developer or viewer any crm:* permission', () => {
    for (const permission of ['crm:view', 'crm:manage', 'crm:assign', 'crm:report'] as const) {
      expect(roleHasPermission('developer', permission)).toBe(false);
      expect(roleHasPermission('viewer', permission)).toBe(false);
    }
  });

  // Module M11 (DECISIONS.md D-098) — four distinct deployment
  // permissions. deployment:view/deployment:create go to every role that
  // already touches the generation pipeline (incl. sales_executive);
  // deployment:rollback/deployment:manage are manager-and-up only.
  // Unlike crm:*, deployment:view also reaches developer/viewer — a
  // deploy failure is exactly the kind of thing a developer needs to see
  // without being handed deployment:create/rollback/manage.
  it('grants deployment:view and deployment:create to sales_executive, but not deployment:rollback or deployment:manage', () => {
    expect(roleHasPermission('sales_executive', 'deployment:view')).toBe(true);
    expect(roleHasPermission('sales_executive', 'deployment:create')).toBe(true);
    expect(roleHasPermission('sales_executive', 'deployment:rollback')).toBe(false);
    expect(roleHasPermission('sales_executive', 'deployment:manage')).toBe(false);
  });

  it('restricts deployment:rollback and deployment:manage to admin/sales_manager/super_admin, same as cost:view', () => {
    const rolesWithCostView = TEAM_ROLES.filter((role) => roleHasPermission(role, 'cost:view'));
    const rolesWithRollback = TEAM_ROLES.filter((role) =>
      roleHasPermission(role, 'deployment:rollback'),
    );
    const rolesWithManage = TEAM_ROLES.filter((role) =>
      roleHasPermission(role, 'deployment:manage'),
    );
    expect(rolesWithRollback.sort()).toEqual(rolesWithCostView.sort());
    expect(rolesWithManage.sort()).toEqual(rolesWithCostView.sort());
  });

  it('grants developer and viewer deployment:view (read-only visibility) but nothing else deployment:*', () => {
    for (const role of ['developer', 'viewer'] as const) {
      expect(roleHasPermission(role, 'deployment:view')).toBe(true);
      expect(roleHasPermission(role, 'deployment:create')).toBe(false);
      expect(roleHasPermission(role, 'deployment:rollback')).toBe(false);
      expect(roleHasPermission(role, 'deployment:manage')).toBe(false);
    }
  });

  // Module M12 (DECISIONS.md D-110) — four distinct analytics
  // permissions. Unlike crm:*/deployment:*, sales_executive holds none of
  // them — every M12 domain is inherently org-wide, the same "manager-
  // tier visibility" class cost:view already restricts.
  it('grants no analytics:* permission to sales_executive', () => {
    for (const permission of [
      'analytics:view',
      'analytics:report',
      'analytics:export',
      'analytics:manage',
    ] as const) {
      expect(roleHasPermission('sales_executive', permission)).toBe(false);
    }
  });

  it('restricts analytics:report/export/manage to admin/sales_manager/super_admin, same as cost:view', () => {
    const rolesWithCostView = TEAM_ROLES.filter((role) => roleHasPermission(role, 'cost:view'));
    for (const permission of [
      'analytics:report',
      'analytics:export',
      'analytics:manage',
    ] as const) {
      const rolesWithPermission = TEAM_ROLES.filter((role) => roleHasPermission(role, permission));
      expect(rolesWithPermission.sort()).toEqual(rolesWithCostView.sort());
    }
  });

  it('grants developer and viewer analytics:view (read-only visibility) but nothing else analytics:*', () => {
    for (const role of ['developer', 'viewer'] as const) {
      expect(roleHasPermission(role, 'analytics:view')).toBe(true);
      expect(roleHasPermission(role, 'analytics:report')).toBe(false);
      expect(roleHasPermission(role, 'analytics:export')).toBe(false);
      expect(roleHasPermission(role, 'analytics:manage')).toBe(false);
    }
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
