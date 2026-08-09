import type { TeamRole } from '@riznexia/shared-types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PermissionsProvider } from '@/src/lib/permissions-context';
import { DeploymentSettingsPage } from './deployment-settings-page';

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => 'test-token' }),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/settings/deployment',
}));

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

const ENVELOPE = {
  reportType: 'deployment',
  generatedAt: '2026-01-01T00:00:00.000Z',
  period: 'monthly',
  filters: { fromDate: null, toDate: null },
  data: {
    totalDeployments: 12,
    byStatus: [{ label: 'completed', count: 12 }],
    byProvider: [{ label: 'vercel', count: 12 }],
    successRatePercent: 100,
    averageExecutionDurationMs: 4500,
  },
};

function renderPage(role: TeamRole) {
  global.fetch = vi.fn(async () => jsonResponse(ENVELOPE)) as unknown as typeof fetch;
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <PermissionsProvider role={role}>
        <DeploymentSettingsPage />
      </PermissionsProvider>
    </QueryClientProvider>,
  );
}

describe('DeploymentSettingsPage', () => {
  it('shows real deployment stats and marks provider config as Not available', async () => {
    renderPage('admin');
    expect(await screen.findByText('vercel')).toBeInTheDocument();
    expect(screen.getByText('Provider')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /View Deployment Dashboard/ })).toHaveAttribute(
      'href',
      '/deployment',
    );
  });

  it('blocks the whole page for a role without team:manage', async () => {
    renderPage('developer');
    expect(await screen.findByText(/don.t have permission to view settings/)).toBeInTheDocument();
  });
});
