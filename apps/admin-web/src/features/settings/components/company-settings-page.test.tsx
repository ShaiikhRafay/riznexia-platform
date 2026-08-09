import type { TeamRole } from '@riznexia/shared-types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PermissionsProvider } from '@/src/lib/permissions-context';
import { CompanySettingsPage } from './company-settings-page';

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => 'test-token' }),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/settings/company',
}));

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

const SETTINGS = {
  id: '11111111-1111-4111-8111-111111111111',
  defaultStageId: null,
  currency: 'USD',
  timezone: 'UTC',
  businessHours: null,
  defaultReminderMinutesBeforeDue: 30,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function renderPage(role: TeamRole) {
  global.fetch = vi.fn(async () => jsonResponse(SETTINGS)) as unknown as typeof fetch;
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <PermissionsProvider role={role}>
        <CompanySettingsPage />
      </PermissionsProvider>
    </QueryClientProvider>,
  );
}

describe('CompanySettingsPage', () => {
  it('shows the real CrmSettings values in an editable form for a crm:manage holder', async () => {
    renderPage('admin');
    expect(await screen.findByDisplayValue('USD')).toBeInTheDocument();
    expect(screen.getByDisplayValue('UTC')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save Changes' })).toBeInTheDocument();
  });

  it('shows fields that have no backend model as Not available, never fabricated', async () => {
    renderPage('admin');
    await screen.findByDisplayValue('USD');
    expect(screen.getByText('Company Name')).toBeInTheDocument();
    expect(screen.getAllByText('Not available').length).toBeGreaterThanOrEqual(6);
  });

  it('blocks the whole page for a role without team:manage', async () => {
    renderPage('viewer');
    expect(await screen.findByText(/don.t have permission to view settings/)).toBeInTheDocument();
    expect(screen.queryByDisplayValue('USD')).not.toBeInTheDocument();
  });
});
