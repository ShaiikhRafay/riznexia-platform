import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PermissionsProvider } from '@/src/lib/permissions-context';
import { PermissionGate } from './permission-gate';

describe('PermissionGate', () => {
  it('renders children when the session holds the required permission', () => {
    render(
      <PermissionsProvider role="admin">
        <PermissionGate permission="team:manage">
          <button>Invite member</button>
        </PermissionGate>
      </PermissionsProvider>,
    );
    expect(screen.getByRole('button', { name: 'Invite member' })).toBeInTheDocument();
  });

  it('renders nothing (not a disabled affordance) when the session lacks the permission and no fallback is given', () => {
    render(
      <PermissionsProvider role="sales_executive">
        <PermissionGate permission="team:manage">
          <button>Invite member</button>
        </PermissionGate>
      </PermissionsProvider>,
    );
    expect(screen.queryByRole('button', { name: 'Invite member' })).not.toBeInTheDocument();
  });

  it('renders the fallback when provided and the permission check fails', () => {
    render(
      <PermissionsProvider role="viewer">
        <PermissionGate permission="crm:manage" fallback={<span>Read-only</span>}>
          <button>Edit</button>
        </PermissionGate>
      </PermissionsProvider>,
    );
    expect(screen.getByText('Read-only')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
  });

  it('supports anyOf semantics — visible if at least one listed permission is held', () => {
    render(
      <PermissionsProvider role="sales_executive">
        <PermissionGate anyOf={['team:manage', 'crm:view']}>
          <span>Visible</span>
        </PermissionGate>
      </PermissionsProvider>,
    );
    expect(screen.getByText('Visible')).toBeInTheDocument();
  });
});
