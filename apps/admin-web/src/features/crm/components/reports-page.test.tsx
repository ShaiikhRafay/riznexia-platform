import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PermissionsProvider } from '@/src/lib/permissions-context';
import { ReportsPage } from './reports-page';

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

// Reports (F10): same `GET /crm/dashboard` endpoint as the CRM Dashboard,
// but with real `fromDate`/`toDate` query params once the date pickers
// are used — "never calculate" business metrics, every number here is a
// direct backend field.
describe('ReportsPage', () => {
  it('renders detailed breakdown tables for every real DashboardStats field', async () => {
    global.fetch = vi.fn(async () => jsonResponse(DASHBOARD_STATS)) as unknown as typeof fetch;
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <PermissionsProvider role="admin">
          <ReportsPage />
        </PermissionsProvider>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('New')).toBeInTheDocument();
    expect(screen.getByText('Jane Rep')).toBeInTheDocument();
    expect(screen.getByText('Too expensive')).toBeInTheDocument();
  });

  it('refetches with a real fromDate query param when the date filter changes', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(DASHBOARD_STATS));
    global.fetch = fetchMock as unknown as typeof fetch;
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <PermissionsProvider role="admin">
          <ReportsPage />
        </PermissionsProvider>
      </QueryClientProvider>,
    );
    await screen.findByText('New');
    fetchMock.mockClear();

    await userEvent.type(screen.getByLabelText('From'), '2026-01-01');

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('fromDate='),
        expect.anything(),
      );
    });
  });
});
