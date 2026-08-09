import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PermissionsProvider } from '@/src/lib/permissions-context';
import { CostAnalyticsPage } from './cost-analytics-page';

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => 'test-token' }),
}));

const { searchParams } = vi.hoisted(() => ({ searchParams: new URLSearchParams() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => searchParams,
  usePathname: () => '/analytics/costs',
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
    leads: { totalLeads: 0 },
    sales: { totalPipelineValueUsd: 0, winRatePercent: null },
    aiUsage: { totalAnalyses: 0, totalTokens: 0 },
    costs: { spentUsd: 47, ceilingUsd: 100, percentUsed: 47 },
    deployments: { totalDeployments: 0, successRatePercent: null },
    websiteStatus: { totalGenerated: 0, averagePublishReadinessScore: null },
    conversion: { overallRatePercent: null },
    systemHealth: { healthy: 0, unhealthy: 0, unknown: 0 },
  },
};

describe('CostAnalyticsPage', () => {
  it('shows the real costs widget (Spent/Ceiling/Percent Used) and only the one real cost report', async () => {
    global.fetch = vi.fn(async () => jsonResponse(DASHBOARD)) as unknown as typeof fetch;
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <PermissionsProvider role="admin">
          <CostAnalyticsPage />
        </PermissionsProvider>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('$47')).toBeInTheDocument();
    expect(screen.getByText('$100')).toBeInTheDocument();
    expect(screen.getByText('47.0%')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'AI Cost Report →' })).toHaveAttribute(
      'href',
      '/analytics/reports?type=ai_cost',
    );
    expect(screen.getAllByRole('link', { name: /Report →/ })).toHaveLength(1);
  });
});
