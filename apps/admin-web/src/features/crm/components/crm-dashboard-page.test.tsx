import type { TeamRole } from '@riznexia/shared-types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RefreshIntervalProvider } from '@/src/features/dashboard/refresh-interval';
import { PermissionsProvider } from '@/src/lib/permissions-context';
import { CrmDashboardPage } from './crm-dashboard-page';

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => 'test-token' }),
}));

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

const DASHBOARD_STATS = {
  generatedAt: '2026-01-01T00:00:00.000Z',
  filters: { fromDate: null, toDate: null, ownerId: null },
  pipelineValueByStage: [
    { stageId: 'stage-1', stageKey: 'new', stageName: 'New', leadCount: 3, totalValueUsd: 9000 },
  ],
  totalPipelineValueUsd: 9000,
  conversionRatePercent: 42.5,
  winRatePercent: 30,
  averageSalesCycleDays: 14,
  lostReasonsBreakdown: [{ lostReasonId: 'reason-1', lostReasonLabel: 'Too expensive', count: 2 }],
  salesPerformanceByRep: [
    {
      ownerId: 'rep-1',
      ownerName: 'Jane Rep',
      openCount: 5,
      wonCount: 2,
      lostCount: 1,
      totalWonValueUsd: 4000,
      averageSalesCycleDays: 10,
    },
  ],
};

function renderPage(role: TeamRole) {
  global.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/crm/tasks')) {
      return jsonResponse({ items: [], nextCursor: null });
    }
    return jsonResponse(DASHBOARD_STATS);
  }) as unknown as typeof fetch;

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <RefreshIntervalProvider>
        <PermissionsProvider role={role}>
          <CrmDashboardPage />
        </PermissionsProvider>
      </RefreshIntervalProvider>
    </QueryClientProvider>,
  );
}

// CRM Dashboard (F10): "Display exactly what the backend provides... Do
// not calculate business metrics on the frontend." "Assigned Leads" is
// resolved as `salesPerformanceByRep`'s per-rep counts, not an invented
// field. `GET /crm/dashboard` requires `crm:report` specifically — a
// `sales_executive` (crm:view/crm:manage but not crm:report) should see
// a permission message, not raw dashboard data.
describe('CrmDashboardPage', () => {
  it('renders every real DashboardStats field for a role with crm:report', async () => {
    renderPage('admin');

    expect(await screen.findByText('New')).toBeInTheDocument();
    expect(screen.getByText('42.5%')).toBeInTheDocument();
    expect(screen.getByText('30.0%')).toBeInTheDocument();
    expect(screen.getByText('Too expensive')).toBeInTheDocument();
    expect(screen.getByText('Jane Rep')).toBeInTheDocument();
  });

  it('shows a permission message, not data, for a role with crm:view but not crm:report (sales_executive)', () => {
    renderPage('sales_executive');
    expect(screen.getByText(/don.t have permission to view CRM reports/)).toBeInTheDocument();
    expect(screen.queryByText('Jane Rep')).not.toBeInTheDocument();
  });
});
