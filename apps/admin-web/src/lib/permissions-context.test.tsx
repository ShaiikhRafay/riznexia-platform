import { render, renderHook, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  PermissionsProvider,
  useHasAnyPermission,
  useHasPermission,
  usePermissions,
} from './permissions-context';

function wrapperFor(role: Parameters<typeof PermissionsProvider>[0]['role']) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <PermissionsProvider role={role}>{children}</PermissionsProvider>;
  };
}

describe('PermissionsProvider / usePermissions', () => {
  it('throws when used outside a PermissionsProvider — a programmer error, not a silent empty set', () => {
    const { result } = renderHook(() => {
      try {
        return { ok: usePermissions() };
      } catch (error) {
        return { error };
      }
    });
    expect(result.current.error).toBeInstanceOf(Error);
  });

  it('derives the permission set from role, matching getPermissionsForRole', () => {
    const { result } = renderHook(() => usePermissions(), {
      wrapper: wrapperFor('sales_executive'),
    });
    expect(result.current.has('crm:view')).toBe(true);
    expect(result.current.has('crm:report')).toBe(false);
  });

  it('useHasPermission reflects the derived set for a single permission', () => {
    const { result } = renderHook(() => useHasPermission('analytics:view'), {
      wrapper: wrapperFor('viewer'),
    });
    expect(result.current).toBe(true);

    const { result: forbidden } = renderHook(() => useHasPermission('team:manage'), {
      wrapper: wrapperFor('viewer'),
    });
    expect(forbidden.current).toBe(false);
  });

  it('useHasAnyPermission is true if at least one listed permission is held, and true for an empty list', () => {
    const { result } = renderHook(() => useHasAnyPermission(['team:manage', 'crm:view']), {
      wrapper: wrapperFor('sales_executive'),
    });
    expect(result.current).toBe(true);

    const { result: none } = renderHook(() => useHasAnyPermission([]), {
      wrapper: wrapperFor('viewer'),
    });
    expect(none.current).toBe(true);

    const { result: denied } = renderHook(() => useHasAnyPermission(['team:manage', 'cost:view']), {
      wrapper: wrapperFor('viewer'),
    });
    expect(denied.current).toBe(false);
  });

  it('re-derives the permission set when role changes', () => {
    function Probe({ role }: { role: 'viewer' | 'admin' }) {
      return (
        <PermissionsProvider role={role}>
          <ProbeChild />
        </PermissionsProvider>
      );
    }
    function ProbeChild() {
      const canManageTeam = useHasPermission('team:manage');
      return <span>{canManageTeam ? 'yes' : 'no'}</span>;
    }

    const { rerender } = render(<Probe role="viewer" />);
    expect(screen.getByText('no')).toBeInTheDocument();

    rerender(<Probe role="admin" />);
    expect(screen.getByText('yes')).toBeInTheDocument();
  });
});
