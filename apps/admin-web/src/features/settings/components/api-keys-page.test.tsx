import type { TeamRole } from '@riznexia/shared-types';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PermissionsProvider } from '@/src/lib/permissions-context';
import { ApiKeysPage } from './api-keys-page';

vi.mock('next/navigation', () => ({
  usePathname: () => '/settings/api-keys',
}));

function renderPage(role: TeamRole) {
  return render(
    <PermissionsProvider role={role}>
      <ApiKeysPage />
    </PermissionsProvider>,
  );
}

describe('ApiKeysPage', () => {
  it('shows an informative read-only state, never a fake key list', () => {
    renderPage('admin');
    expect(screen.getByText('API Key Management')).toBeInTheDocument();
    expect(screen.getByText(/does not expose an API key management endpoint/)).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('blocks the whole page for a role without team:manage', () => {
    renderPage('sales_executive');
    expect(screen.getByText(/don.t have permission to view settings/)).toBeInTheDocument();
    expect(screen.queryByText('API Key Management')).not.toBeInTheDocument();
  });
});
