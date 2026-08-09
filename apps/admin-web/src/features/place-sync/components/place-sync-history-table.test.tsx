import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PlaceSyncHistoryTable } from './place-sync-history-table';

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => 'test-token' }),
}));

function job(id: string, overrides: Partial<Record<string, unknown>>) {
  return {
    id,
    provider: 'google',
    city: 'Karachi',
    category: 'restaurant',
    keyword: null,
    latitude: null,
    longitude: null,
    radiusMeters: 15000,
    status: 'completed',
    startedAt: '2026-01-01T00:00:00.000Z',
    finishedAt: '2026-01-01T00:05:00.000Z',
    duration: 300,
    successRate: 1,
    apiCallsUsed: 5,
    estimatedCost: 0.05,
    businessesFound: 10,
    businessesCreated: 8,
    businessesUpdated: 2,
    businessesFailed: 0,
    errorMessage: null,
    ...overrides,
  };
}

const JOBS = [
  job('1', { city: 'Karachi' }),
  job('2', {
    city: 'Lahore',
    status: 'running',
    businessesCreated: 0,
    businessesUpdated: 0,
    startedAt: '2026-01-02T00:00:00.000Z',
    finishedAt: null,
  }),
  job('3', {
    city: 'Islamabad',
    status: 'failed',
    businessesCreated: 0,
    businessesUpdated: 0,
    finishedAt: null,
    errorMessage: 'boom',
  }),
];

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

function renderTable() {
  global.fetch = vi.fn(async () => jsonResponse(JOBS)) as unknown as typeof fetch;
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <PlaceSyncHistoryTable />
    </QueryClientProvider>,
  );
}

describe('PlaceSyncHistoryTable', () => {
  it('renders every job from GET /place-sync-jobs with a status badge and the real backend counts', async () => {
    renderTable();
    expect(await screen.findByText('Karachi')).toBeInTheDocument();

    // Scoped to each data row: the Status filter <select> options and the
    // "Failed" column's own sortable header label would otherwise collide
    // with the StatusBadge cells (the same ambiguity class fixed in F3/F4).
    const dataRows = screen.getAllByRole('row').slice(1);
    expect(within(dataRows[0] as HTMLElement).getByText('Completed')).toBeInTheDocument();
    expect(within(dataRows[1] as HTMLElement).getByText('Running')).toBeInTheDocument();
    expect(within(dataRows[2] as HTMLElement).getByText('Failed')).toBeInTheDocument();
    expect(within(dataRows[0] as HTMLElement).getByText('8')).toBeInTheDocument();
  });

  it('filters via the global search box, client-side over the loaded top-50 list', async () => {
    renderTable();
    await screen.findByText('Karachi');

    await userEvent.type(screen.getByRole('textbox', { name: 'Search' }), 'Lahore');
    expect(screen.getByText('Lahore')).toBeInTheDocument();
    expect(screen.queryByText('Karachi')).not.toBeInTheDocument();
  });

  it('links each row to its job detail page', async () => {
    renderTable();
    await screen.findByText('Karachi');
    const viewLinks = screen.getAllByRole('link', { name: 'View' });
    expect(viewLinks[0]).toHaveAttribute('href', '/discovery/sync/1');
  });

  it('shows the empty state when no synchronizations exist yet', async () => {
    global.fetch = vi.fn(async () => jsonResponse([])) as unknown as typeof fetch;
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <PlaceSyncHistoryTable />
      </QueryClientProvider>,
    );
    expect(await screen.findByText('No synchronizations yet')).toBeInTheDocument();
  });
});
