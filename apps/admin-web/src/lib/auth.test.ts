import { describe, expect, it } from 'vitest';
import type { TeamRole } from '@riznexia/shared-types';
import { isNavItemVisible, NAV_ITEMS, visibleNavItems } from './auth';
import { getPermissionsForRole } from './permissions';

const ALL_ROLES: TeamRole[] = [
  'super_admin',
  'admin',
  'sales_manager',
  'developer',
  'sales_executive',
  'viewer',
];

function permissionsFor(role: TeamRole): ReadonlySet<import('./permissions').Permission> {
  return new Set(getPermissionsForRole(role));
}

describe('nav visibility (permission-driven)', () => {
  it('shows Dashboard, Discovery, and Leads to every role (ungated items)', () => {
    for (const role of ALL_ROLES) {
      const items = visibleNavItems(permissionsFor(role)).map((item) => item.id);
      expect(items).toContain('dashboard');
      expect(items).toContain('discovery');
      expect(items).toContain('leads');
    }
  });

  it('hides Team and Settings from roles without team:manage', () => {
    for (const role of ['sales_executive', 'developer', 'viewer'] as TeamRole[]) {
      const items = visibleNavItems(permissionsFor(role)).map((item) => item.id);
      expect(items).not.toContain('team');
      expect(items).not.toContain('settings');
    }
  });

  it('shows Team and Settings to roles with team:manage (admin, sales_manager, super_admin)', () => {
    for (const role of ['super_admin', 'admin', 'sales_manager'] as TeamRole[]) {
      const items = visibleNavItems(permissionsFor(role)).map((item) => item.id);
      expect(items).toContain('team');
      expect(items).toContain('settings');
    }
  });

  it('hides Sales CRM from roles without crm:view (developer, viewer)', () => {
    for (const role of ['developer', 'viewer'] as TeamRole[]) {
      expect(visibleNavItems(permissionsFor(role)).map((item) => item.id)).not.toContain('crm');
    }
  });

  it('shows Analytics to roles with analytics:view but hides Sales CRM from them when they lack crm:view', () => {
    for (const role of ['developer', 'viewer'] as TeamRole[]) {
      const items = visibleNavItems(permissionsFor(role)).map((item) => item.id);
      expect(items).toContain('analytics');
      expect(items).not.toContain('crm');
    }
  });

  it('hides Analytics from sales_executive (holds crm:view but not analytics:view)', () => {
    const items = visibleNavItems(permissionsFor('sales_executive')).map((item) => item.id);
    expect(items).toContain('crm');
    expect(items).not.toContain('analytics');
  });

  it('shows Website Preview to roles with website:preview (admin, sales_manager, sales_executive, super_admin)', () => {
    for (const role of ['super_admin', 'admin', 'sales_manager', 'sales_executive'] as TeamRole[]) {
      expect(visibleNavItems(permissionsFor(role)).map((item) => item.id)).toContain(
        'website-preview',
      );
    }
  });

  it('hides Website Preview from roles without website:preview (developer, viewer) — unlike F5-F8, this nav entry is itself gated', () => {
    for (const role of ['developer', 'viewer'] as TeamRole[]) {
      expect(visibleNavItems(permissionsFor(role)).map((item) => item.id)).not.toContain(
        'website-preview',
      );
    }
  });

  it('shows Deployment to every role — deployment:view is gated (not null) but every role currently holds it', () => {
    for (const role of ALL_ROLES) {
      expect(visibleNavItems(permissionsFor(role)).map((item) => item.id)).toContain('deployment');
    }
  });

  it('hides Deployment from a caller with no permissions at all, proving it is really gated and not null', () => {
    expect(visibleNavItems(new Set()).map((item) => item.id)).not.toContain('deployment');
  });

  it('is driven purely by the permission set passed in — an empty set hides everything gated', () => {
    const items = visibleNavItems(new Set()).map((item) => item.id);
    expect(items).toEqual([
      'dashboard',
      'discovery',
      'place-sync',
      'leads',
      'business-analysis',
      'theme-engine',
      'website-generator',
    ]);
  });

  it('isNavItemVisible agrees with visibleNavItems for every item/role combination', () => {
    for (const role of ALL_ROLES) {
      const permissions = permissionsFor(role);
      const visibleIds = new Set(visibleNavItems(permissions).map((item) => item.id));
      for (const item of NAV_ITEMS) {
        expect(isNavItemVisible(item, permissions)).toBe(visibleIds.has(item.id));
      }
    }
  });
});
