import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DiscoveryHistoryTable } from './discovery-history-table';

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => 'test-token' }),
}));

const JOBS = [
  { id: '1', city: 'Karachi', category: 'restaurant', status: 'completed', resultsCount: 12 },
  { id: '2', city: 'Lahore', category: 'clinic', status: 'running', resultsCount: 0 },
  { id: '3', city: 'Islamabad', category: 'gym', status: 'failed', resultsCount: 0 },
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
      <DiscoveryHistoryTable />
    </QueryClientProvider>,
  );
}

describe('DiscoveryHistoryTable', () => {
  it('renders every job from GET /discovery-jobs with a status badge', async () => {
    renderTable();
    expect(await screen.findByText('Karachi')).toBeInTheDocument();

    // Scoped to the table itself: the Status column's own filter <select>
    // also contains "Completed"/"Running"/"Failed" as <option> text, which
    // would otherwise collide with the StatusBadge cells rendering the same
    // words.
    const table = within(screen.getByRole('table'));
    expect(table.getByText('Completed')).toBeInTheDocument();
    expect(table.getByText('Running')).toBeInTheDocument();
    expect(table.getByText('Failed')).toBeInTheDocument();
  });

  it('filters via the global search box, client-side over the loaded top-50 list', async () => {
    renderTable();
    await screen.findByText('Karachi');

    await userEvent.type(screen.getByRole('textbox', { name: 'Search' }), 'clinic');
    expect(screen.getByText('Lahore')).toBeInTheDocument();
    expect(screen.queryByText('gym')).not.toBeInTheDocument();
  });

  it('links each row to its job detail page', async () => {
    renderTable();
    await screen.findByText('Karachi');
    const viewLinks = screen.getAllByRole('link', { name: 'View' });
    expect(viewLinks[0]).toHaveAttribute('href', '/discovery/1');
  });

  it('shows the empty state when no jobs exist yet', async () => {
    global.fetch = vi.fn(async () => jsonResponse([])) as unknown as typeof fetch;
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <DiscoveryHistoryTable />
      </QueryClientProvider>,
    );
    expect(await screen.findByText('No discovery searches yet')).toBeInTheDocument();
  });
});
