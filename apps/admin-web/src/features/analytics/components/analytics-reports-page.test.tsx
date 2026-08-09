import type { TeamRole } from '@riznexia/shared-types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PermissionsProvider } from '@/src/lib/permissions-context';
import { AnalyticsReportsPage } from './analytics-reports-page';

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => 'test-token' }),
}));

const { push, searchParams } = vi.hoisted(() => ({
  push: vi.fn(),
  searchParams: new URLSearchParams(),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => searchParams,
  usePathname: () => '/analytics/reports',
}));

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function envelope(reportType: string, data: unknown) {
  return {
    reportType,
    generatedAt: '2026-01-01T00:00:00.000Z',
    period: 'monthly',
    filters: { fromDate: null, toDate: null },
    data,
  };
}

function renderPage(role: TeamRole, fetchImpl: typeof fetch) {
  global.fetch = fetchImpl;
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <PermissionsProvider role={role}>
        <AnalyticsReportsPage />
      </PermissionsProvider>
    </QueryClientProvider>,
  );
}

describe('AnalyticsReportsPage', () => {
  it('defaults to the Sales Funnel (lead_funnel) report and lists all fifteen real report types', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse(
        envelope('lead_funnel', {
          stages: [{ stageKey: 'new', stageName: 'New', count: 1 }],
          totalLeads: 1,
        }),
      ),
    );
    renderPage('admin', fetchMock as unknown as typeof fetch);

    expect(await screen.findByText('Total leads: 1')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Report' })).toHaveValue('lead_funnel');
    expect(screen.getAllByRole('option')).toHaveLength(15);
  });

  it('switches reports and refetches when a different report is selected', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/analytics/reports/audit')) {
        return jsonResponse(envelope('audit', { items: [], nextCursor: null }));
      }
      return jsonResponse(envelope('lead_funnel', { stages: [], totalLeads: 0 }));
    });
    renderPage('admin', fetchMock as unknown as typeof fetch);
    await screen.findByText('Total leads: 0');

    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Report' }), 'audit');
    expect(push).toHaveBeenCalledWith(expect.stringContaining('type=audit'));
  });

  it('shows Export CSV gated by analytics:export', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse(envelope('lead_funnel', { stages: [], totalLeads: 0 })),
    );
    renderPage('admin', fetchMock as unknown as typeof fetch);
    expect(await screen.findByRole('button', { name: 'Export CSV' })).toBeInTheDocument();
  });

  it('shows the report-gate fallback, not report content, for a role without analytics:report (viewer)', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse(envelope('lead_funnel', { stages: [], totalLeads: 0 })),
    );
    renderPage('viewer', fetchMock as unknown as typeof fetch);
    expect(
      await screen.findByText(/don.t have permission to view full analytics reports/),
    ).toBeInTheDocument();
  });
});
