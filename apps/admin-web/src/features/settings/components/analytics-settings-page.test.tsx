import type { TeamRole } from '@riznexia/shared-types';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PermissionsProvider } from '@/src/lib/permissions-context';
import { AnalyticsSettingsPage } from './analytics-settings-page';

vi.mock('next/navigation', () => ({
  usePathname: () => '/settings/analytics',
}));

function renderPage(role: TeamRole) {
  return render(
    <PermissionsProvider role={role}>
      <AnalyticsSettingsPage />
    </PermissionsProvider>,
  );
}

describe('AnalyticsSettingsPage', () => {
  it('states real fixed system behavior, never an invented retention setting', () => {
    renderPage('admin');
    expect(screen.getByText(/Export format: CSV only/)).toBeInTheDocument();
    expect(screen.getByText(/1,000 rows per export/)).toBeInTheDocument();
    expect(screen.getByText('Configurable Settings')).toBeInTheDocument();
  });

  it('blocks the whole page for a role without team:manage', () => {
    renderPage('viewer');
    expect(screen.getByText(/don.t have permission to view settings/)).toBeInTheDocument();
  });
});
