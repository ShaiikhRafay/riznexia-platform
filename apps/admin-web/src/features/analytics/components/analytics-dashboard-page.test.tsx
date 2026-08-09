import type { TeamRole } from '@riznexia/shared-types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PermissionsProvider } from '@/src/lib/permissions-context';
import { AnalyticsDashboardPage } from './analytics-dashboard-page';

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => 'test-token' }),
}));

const { searchParams } = vi.hoisted(() => ({ searchParams: new URLSearchParams() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => searchParams,
  usePathname: () => '/analytics',
}));

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const DASHBOARD = {
  generatedAt: '2026-01-01T00:00:00.000Z',
  period: 'monthly',
  widgets: {
    leads: { totalLeads: 12 },
    sales: { totalPipelineValueUsd: 5000, winRatePercent: 40 },
    aiUsage: { totalAnalyses: 8, totalTokens: 20000 },
    costs: { spentUsd: 15, ceilingUsd: 100, percentUsed: 15 },
    deployments: { totalDeployments: 3, successRatePercent: 100 },
    websiteStatus: { totalGenerated: 2, averagePublishReadinessScore: 85 },
    conversion: { overallRatePercent: 25 },
    systemHealth: { healthy: 3, unhealthy: 0, unknown: 0 },
  },
};

function renderPage(role: TeamRole, body: unknown, status = 200) {
  global.fetch = vi.fn(async () => jsonResponse(body, status)) as unknown as typeof fetch;
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <PermissionsProvider role={role}>
        <AnalyticsDashboardPage />
      </PermissionsProvider>
    </QueryClientProvider>,
  );
}

describe('AnalyticsDashboardPage', () => {
  it('displays the real eight composed widgets, grouped under Business Analytics/Usage Analytics/System Monitoring', async () => {
    renderPage('admin', DASHBOARD);

    expect(await screen.findByText('Business Analytics')).toBeInTheDocument();
    expect(screen.getByText('Usage Analytics')).toBeInTheDocument();
    expect(screen.getByText('System Monitoring')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('$5,000')).toBeInTheDocument();
    expect(screen.getByText('25.0%')).toBeInTheDocument();
  });

  it('links out to Audit Logs and User Activity, since neither has a dashboard widget', async () => {
    renderPage('admin', DASHBOARD);
    expect(await screen.findByRole('link', { name: 'Audit Activity →' })).toHaveAttribute(
      'href',
      '/analytics/audit',
    );
    expect(screen.getByRole('link', { name: 'User Activity →' })).toHaveAttribute(
      'href',
      '/analytics/activity',
    );
  });

  it('shows an ErrorState with retry when the composed dashboard call fails', async () => {
    renderPage(
      'admin',
      { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } },
      500,
    );
    expect(await screen.findByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('hides all analytics content for a role without analytics:view (sales_executive)', async () => {
    renderPage('sales_executive', DASHBOARD);
    expect(await screen.findByText(/don.t have permission to view analytics/)).toBeInTheDocument();
    expect(screen.queryByText('Business Analytics')).not.toBeInTheDocument();
  });
});
