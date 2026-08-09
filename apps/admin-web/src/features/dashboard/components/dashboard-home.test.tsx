import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import type { TeamRole } from '@riznexia/shared-types';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CurrentUserProvider } from '@/src/lib/current-user-context';
import { PermissionsProvider } from '@/src/lib/permissions-context';
import { DashboardHome } from './dashboard-home';

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => 'test-token' }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const ANALYTICS_DASHBOARD = {
  generatedAt: '2026-01-01T00:00:00.000Z',
  period: 'monthly',
  widgets: {
    leads: { totalLeads: 10 },
    sales: { totalPipelineValueUsd: 5000, winRatePercent: 25 },
    aiUsage: { totalAnalyses: 4, totalTokens: 3000 },
    costs: { spentUsd: 50, ceilingUsd: 300, percentUsed: 16.67 },
    deployments: { totalDeployments: 2, successRatePercent: 100 },
    websiteStatus: { totalGenerated: 2, averagePublishReadinessScore: 90 },
    conversion: { overallRatePercent: 20 },
    systemHealth: { healthy: 2, unhealthy: 0, unknown: 0 },
  },
};

const CRM_DASHBOARD = {
  generatedAt: '2026-01-01T00:00:00.000Z',
  filters: { fromDate: null, toDate: null, ownerId: null },
  pipelineValueByStage: [
    {
      stageId: '11111111-1111-4111-8111-111111111111',
      stageKey: 'new',
      stageName: 'New',
      leadCount: 3,
      totalValueUsd: 1000,
    },
  ],
  totalPipelineValueUsd: 1000,
  conversionRatePercent: 20,
  winRatePercent: 25,
  averageSalesCycleDays: 10,
  lostReasonsBreakdown: [],
  salesPerformanceByRep: [
    {
      ownerId: '22222222-2222-4222-8222-222222222222',
      ownerName: 'Jane Rep',
      openCount: 1,
      wonCount: 1,
      lostCount: 0,
      totalWonValueUsd: 500,
      averageSalesCycleDays: 5,
    },
  ],
};

const MY_TASKS = {
  items: [
    {
      id: '33333333-3333-4333-8333-333333333333',
      leadId: '44444444-4444-4444-8444-444444444444',
      title: 'Call Joe about renewal',
      description: null,
      dueDate: '2026-01-05T00:00:00.000Z',
      priority: 'medium',
      status: 'pending',
      assignedToId: 'member-1',
      reminderAt: null,
      estimatedDurationMinutes: null,
      actualDurationMinutes: null,
      completedById: null,
      completedAt: null,
      createdById: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  nextCursor: null,
};

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

function renderAs(role: TeamRole) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <CurrentUserProvider
        currentUser={{ id: 'member-1', name: 'Jane Rep', email: 'jane@riznexia.com', role }}
      >
        <PermissionsProvider role={role}>
          <DashboardHome />
        </PermissionsProvider>
      </CurrentUserProvider>
    </QueryClientProvider>,
  );
}

// Integration test: DashboardHome + the real permission-driven composition
// (useHasPermission branching) + WidgetRegistry + the M10/M12 hooks, all
// wired together against a mocked fetch boundary — proving the actual
// approved architecture's role-based fallback (open question 1), not just
// each piece in isolation.
describe('DashboardHome (integration)', () => {
  beforeEach(() => {
    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/analytics/dashboard')) return jsonResponse(ANALYTICS_DASHBOARD);
      if (url.includes('/crm/dashboard')) return jsonResponse(CRM_DASHBOARD);
      if (url.includes('/crm/tasks')) return jsonResponse(MY_TASKS);
      return new Response('Not Found', { status: 404 });
    }) as unknown as typeof fetch;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows the widget grid and the CRM pipeline section for admin (holds both analytics:view and crm:report)', async () => {
    renderAs('admin');

    expect(await screen.findByText('Pipeline by Stage')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('10')).toBeInTheDocument()); // Leads widget totalLeads
    expect(screen.queryByText('My Work')).not.toBeInTheDocument();
  });

  it('shows only the widget grid for developer (analytics:view, no crm:report)', async () => {
    renderAs('developer');

    await waitFor(() => expect(screen.getByText('10')).toBeInTheDocument());
    expect(screen.queryByText('Pipeline by Stage')).not.toBeInTheDocument();
    expect(screen.queryByText('My Work')).not.toBeInTheDocument();
  });

  it('shows the "My Work" fallback for sales_executive (neither analytics:view nor crm:report)', async () => {
    renderAs('sales_executive');

    expect(await screen.findByText('My Work')).toBeInTheDocument();
    expect(await screen.findByText('Call Joe about renewal')).toBeInTheDocument();
    expect(screen.queryByText('Pipeline by Stage')).not.toBeInTheDocument();
    expect(screen.queryByTestId('widget-registry')).not.toBeInTheDocument();
  });
});
