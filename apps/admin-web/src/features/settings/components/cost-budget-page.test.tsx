import type { TeamRole } from '@riznexia/shared-types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PermissionsProvider } from '@/src/lib/permissions-context';
import { CostBudgetPage } from './cost-budget-page';

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => 'test-token' }),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/settings/cost-budget',
}));

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

function envelope(currentMonthSpendUsd: number, monthlyCeilingUsd: number) {
  return {
    reportType: 'ai_cost',
    generatedAt: '2026-01-01T00:00:00.000Z',
    period: 'monthly',
    filters: { fromDate: null, toDate: null },
    data: {
      totalCostUsd: currentMonthSpendUsd,
      byEventType: [],
      byPeriod: [],
      currentMonthSpendUsd,
      monthlyCeilingUsd,
    },
  };
}

function renderPage(role: TeamRole, body: unknown) {
  global.fetch = vi.fn(async () => jsonResponse(body)) as unknown as typeof fetch;
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <PermissionsProvider role={role}>
        <CostBudgetPage />
      </PermissionsProvider>
    </QueryClientProvider>,
  );
}

describe('CostBudgetPage', () => {
  it('shows a warning banner once real spend reaches 80% of the real ceiling', async () => {
    renderPage('admin', envelope(90, 100));
    expect(await screen.findByText(/90% of the monthly AI cost ceiling/)).toBeInTheDocument();
  });

  it('shows no warning banner when spend is comfortably under the ceiling', async () => {
    renderPage('admin', envelope(10, 100));
    await screen.findByText('Monthly Ceiling');
    expect(screen.queryByText(/of the monthly AI cost ceiling/)).not.toBeInTheDocument();
  });

  it('defaults to Monthly and refetches when a different period is selected (no Custom Range option)', async () => {
    renderPage('admin', envelope(10, 100));
    await screen.findByText('Monthly Ceiling');
    expect(screen.getByRole('button', { name: 'Monthly' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('button', { name: 'Custom Range' })).not.toBeInTheDocument();

    const fetchSpy = global.fetch as unknown as ReturnType<typeof vi.fn>;
    const callsBefore = fetchSpy.mock.calls.length;
    await userEvent.click(screen.getByRole('button', { name: 'Daily' }));

    await waitFor(() => expect(fetchSpy.mock.calls.length).toBeGreaterThan(callsBefore));
    expect(screen.getByRole('button', { name: 'Daily' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('blocks the whole page for a role without team:manage', async () => {
    renderPage('viewer', envelope(10, 100));
    expect(await screen.findByText(/don.t have permission to view settings/)).toBeInTheDocument();
  });
});
