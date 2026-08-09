import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PermissionsProvider } from '@/src/lib/permissions-context';
import { UsageAnalyticsPage } from './usage-analytics-page';

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => 'test-token' }),
}));

const { searchParams } = vi.hoisted(() => ({ searchParams: new URLSearchParams() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => searchParams,
  usePathname: () => '/analytics/usage',
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
    aiUsage: { totalAnalyses: 9, totalTokens: 4000 },
    costs: { spentUsd: 22, ceilingUsd: 100, percentUsed: 22 },
    deployments: { totalDeployments: 5, successRatePercent: 80 },
    websiteStatus: { totalGenerated: 3, averagePublishReadinessScore: 90 },
    conversion: { overallRatePercent: null },
    systemHealth: { healthy: 0, unhealthy: 0, unknown: 0 },
  },
};

describe('UsageAnalyticsPage', () => {
  it('shows the real AI Usage/Cost/Deployment/Website Generation widget slice and matching report links, never API/Preview Usage', async () => {
    global.fetch = vi.fn(async () => jsonResponse(DASHBOARD)) as unknown as typeof fetch;
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <PermissionsProvider role="admin">
          <UsageAnalyticsPage />
        </PermissionsProvider>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('9')).toBeInTheDocument();
    expect(screen.getByText('$22')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'AI Usage Report →' })).toHaveAttribute(
      'href',
      '/analytics/reports?type=ai_usage',
    );
    expect(screen.getByRole('link', { name: 'Theme Report →' })).toHaveAttribute(
      'href',
      '/analytics/reports?type=theme_usage',
    );
    expect(screen.queryByText(/API Usage/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Preview Usage/)).not.toBeInTheDocument();
  });
});
