import { describe, expect, it, vi } from 'vitest';

const { notFound } = vi.hoisted(() => ({ notFound: vi.fn() }));
vi.mock('next/navigation', () => ({ notFound }));

import { assertPermission, hasAnyPermission, hasPermission } from './route-guard';

describe('route guard (permission-based Server Component gate)', () => {
  it('hasPermission/hasAnyPermission mirror getPermissionsForRole, never invoking notFound()', () => {
    expect(hasPermission('sales_executive', 'crm:view')).toBe(true);
    expect(hasPermission('sales_executive', 'team:manage')).toBe(false);
    expect(hasAnyPermission('viewer', ['team:manage', 'analytics:view'])).toBe(true);
    expect(hasAnyPermission('viewer', [])).toBe(true);
    expect(notFound).not.toHaveBeenCalled();
  });

  it('assertPermission is a no-op when the role holds the permission', () => {
    notFound.mockClear();
    assertPermission('admin', 'team:manage');
    expect(notFound).not.toHaveBeenCalled();
  });

  it('assertPermission calls notFound() when the role lacks the permission — never throws itself', () => {
    notFound.mockClear();
    expect(() => assertPermission('sales_executive', 'team:manage')).not.toThrow();
    expect(notFound).toHaveBeenCalledTimes(1);
  });
});
