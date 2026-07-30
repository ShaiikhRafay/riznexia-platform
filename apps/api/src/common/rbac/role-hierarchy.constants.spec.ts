import { TEAM_ROLES } from '@riznexia/shared-types';
import { ROLE_HIERARCHY, roleMeetsMinimum } from './role-hierarchy.constants';

describe('role-hierarchy.constants', () => {
  it('assigns a hierarchy level to every role in the shared-types enum', () => {
    for (const role of TEAM_ROLES) {
      expect(typeof ROLE_HIERARCHY[role]).toBe('number');
    }
  });

  it('ranks super_admin above every other role', () => {
    const others = TEAM_ROLES.filter((role) => role !== 'super_admin');
    for (const role of others) {
      expect(ROLE_HIERARCHY.super_admin).toBeGreaterThan(ROLE_HIERARCHY[role]);
    }
  });

  it('ranks viewer at or below every other role', () => {
    for (const role of TEAM_ROLES) {
      expect(ROLE_HIERARCHY[role]).toBeGreaterThanOrEqual(ROLE_HIERARCHY.viewer);
    }
  });

  it('places developer above sales_executive but below sales_manager (lateral technical track, not sales seniority)', () => {
    expect(ROLE_HIERARCHY.developer).toBeGreaterThan(ROLE_HIERARCHY.sales_executive);
    expect(ROLE_HIERARCHY.developer).toBeLessThan(ROLE_HIERARCHY.sales_manager);
  });

  describe('roleMeetsMinimum', () => {
    it('returns true when the role outranks the minimum', () => {
      expect(roleMeetsMinimum('admin', 'sales_manager')).toBe(true);
    });

    it('returns true when the role exactly equals the minimum', () => {
      expect(roleMeetsMinimum('sales_manager', 'sales_manager')).toBe(true);
    });

    it('returns false when the role is below the minimum', () => {
      expect(roleMeetsMinimum('sales_executive', 'sales_manager')).toBe(false);
    });

    it('excludes developer from a sales_manager-or-above threshold', () => {
      expect(roleMeetsMinimum('developer', 'sales_manager')).toBe(false);
    });

    it('super_admin meets every threshold', () => {
      for (const role of TEAM_ROLES) {
        expect(roleMeetsMinimum('super_admin', role)).toBe(true);
      }
    });
  });
});
