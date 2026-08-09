import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PermissionsProvider } from '@/src/lib/permissions-context';
import { SystemMonitoringPage } from './system-monitoring-page';

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => 'test-token' }),
}));

const { searchParams } = vi.hoisted(() => ({ searchParams: new URLSearchParams() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => searchParams,
  usePathname: () => '/analytics/system',
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
    costs: { spentUsd: 0, ceilingUsd: 100, percentUsed: 0 },
    deployments: { totalDeployments: 0, successRatePercent: null },
    websiteStatus: { totalGenerated: 0, averagePublishReadinessScore: null },
    conversion: { overallRatePercent: null },
    systemHealth: { healthy: 5, unhealthy: 2, unknown: 1 },
  },
};

describe('SystemMonitoringPage', () => {
  it('shows the real Platform Health widget slice and Health/Error report links', async () => {
    global.fetch = vi.fn(async () => jsonResponse(DASHBOARD)) as unknown as typeof fetch;
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <PermissionsProvider role="admin">
          <SystemMonitoringPage />
        </PermissionsProvider>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('5')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'System Health Report →' })).toHaveAttribute(
      'href',
      '/analytics/reports?type=health',
    );
    expect(screen.getByRole('link', { name: 'Error Report →' })).toHaveAttribute(
      'href',
      '/analytics/reports?type=error',
    );
  });
});
