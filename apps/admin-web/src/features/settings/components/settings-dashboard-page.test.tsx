import type { TeamRole } from '@riznexia/shared-types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PermissionsProvider } from '@/src/lib/permissions-context';
import { SettingsDashboardPage } from './settings-dashboard-page';

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => 'test-token' }),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/settings',
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
        <SettingsDashboardPage />
      </PermissionsProvider>
    </QueryClientProvider>,
  );
}

describe('SettingsDashboardPage', () => {
  it('links to all ten real sub-pages', () => {
    renderPage('admin');
    const hrefs = screen.getAllByRole('link').map((link) => link.getAttribute('href'));
    for (const href of [
      '/settings/company',
      '/settings/ai',
      '/settings/api-keys',
      '/settings/prompts',
      '/settings/theme-defaults',
      '/settings/deployment',
      '/settings/cost-budget',
      '/settings/analytics',
      '/settings/system',
      '/settings/audit',
    ]) {
      expect(hrefs).toContain(href);
    }
  });

  it('shows the real quick-glance currency/timezone from CrmSettings', async () => {
    renderPage('admin');
    expect(await screen.findByText('USD')).toBeInTheDocument();
    expect(screen.getByText('UTC')).toBeInTheDocument();
  });

  it('blocks the whole page for a role without team:manage', () => {
    renderPage('developer');
    expect(screen.getByText(/don.t have permission to view settings/)).toBeInTheDocument();
  });
});
