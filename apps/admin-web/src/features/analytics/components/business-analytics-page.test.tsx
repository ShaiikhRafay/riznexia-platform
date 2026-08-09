import type { TeamRole } from '@riznexia/shared-types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PermissionsProvider } from '@/src/lib/permissions-context';
import { BusinessAnalyticsPage } from './business-analytics-page';

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => 'test-token' }),
}));

const { searchParams } = vi.hoisted(() => ({ searchParams: new URLSearchParams() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => searchParams,
  usePathname: () => '/analytics/business',
}));

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

const DASHBOARD = {
  generatedAt: '2026-01-01T00:00:00.000Z',
  period: 'monthly',
  widgets: {
    leads: { totalLeads: 7 },
    sales: { totalPipelineValueUsd: 3000, winRatePercent: 33 },
    aiUsage: { totalAnalyses: 4, totalTokens: 500 },
    costs: { spentUsd: 1, ceilingUsd: 100, percentUsed: 1 },
    deployments: { totalDeployments: 0, successRatePercent: null },
    websiteStatus: { totalGenerated: 0, averagePublishReadinessScore: null },
    conversion: { overallRatePercent: 10 },
    systemHealth: { healthy: 0, unhealthy: 0, unknown: 0 },
  },
};

describe('BusinessAnalyticsPage', () => {
  it('shows the real Leads/CRM Performance/Growth/Business Analysis widget slice and real report links', async () => {
    global.fetch = vi.fn(async () => jsonResponse(DASHBOARD)) as unknown as typeof fetch;
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <PermissionsProvider role="admin">
          <BusinessAnalyticsPage />
        </PermissionsProvider>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('7')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Sales Funnel →' })).toHaveAttribute(
      'href',
      '/analytics/reports?type=lead_funnel',
    );
    expect(screen.getByRole('link', { name: 'Industry Report →' })).toHaveAttribute(
      'href',
      '/analytics/reports?type=industry',
    );
    expect(screen.getByRole('link', { name: 'Category Report →' })).toHaveAttribute(
      'href',
      '/analytics/reports?type=business_category',
    );
    // API Usage and Preview Usage have no backend data source — never fabricated as links here.
    expect(screen.queryByText(/API Usage/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Preview Usage/)).not.toBeInTheDocument();
  });

  it('hides content for a role without analytics:view (sales_executive)', async () => {
    global.fetch = vi.fn(async () => jsonResponse(DASHBOARD)) as unknown as typeof fetch;
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <PermissionsProvider role={'sales_executive' as TeamRole}>
          <BusinessAnalyticsPage />
        </PermissionsProvider>
      </QueryClientProvider>,
    );
    expect(await screen.findByText(/don.t have permission to view analytics/)).toBeInTheDocument();
  });
});
