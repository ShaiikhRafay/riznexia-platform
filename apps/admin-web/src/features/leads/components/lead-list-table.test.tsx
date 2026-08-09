import type { TeamRole } from '@riznexia/shared-types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CurrentUserProvider } from '@/src/lib/current-user-context';
import { PermissionsProvider } from '@/src/lib/permissions-context';
import { LeadListTable } from './lead-list-table';

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => 'test-token' }),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}));

function lead(id: string, overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id,
    businessId: `business-${id}`,
    businessName: `Business ${id}`,
    category: 'restaurant',
    city: 'Karachi',
    address: '123 Main St',
    websiteStatus: 'none',
    pipelineStage: 'new',
    assignedTo: null,
    tags: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

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
          <LeadListTable />
        </PermissionsProvider>
      </CurrentUserProvider>
    </QueryClientProvider>,
  );
}

function lastFetchedUrl(fetchMock: ReturnType<typeof vi.fn>): URL {
  const call = fetchMock.mock.calls.at(-1);
  return new URL(String(call?.[0]));
}

describe('LeadListTable', () => {
  it('renders every lead from GET /leads with a stage badge', async () => {
    global.fetch = vi.fn(async () =>
      jsonResponse({ items: [lead('1', { pipelineStage: 'won' })], nextCursor: null }),
    ) as unknown as typeof fetch;
    renderAs('admin');

    expect(await screen.findByText('Business 1')).toBeInTheDocument();
    // Scoped to the table: the Stage filter <select> also has a "Won"
    // <option>, which would otherwise collide with the StatusBadge cell.
    expect(within(screen.getByRole('table')).getByText('Won')).toBeInTheDocument();
  });

  it('shows the empty state when no leads match', async () => {
    global.fetch = vi.fn(async () =>
      jsonResponse({ items: [], nextCursor: null }),
    ) as unknown as typeof fetch;
    renderAs('admin');

    expect(await screen.findByText('No leads found')).toBeInTheDocument();
  });

  it('shows an inline error state with retry on a failed fetch', async () => {
    global.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'boom' } }), {
          status: 500,
          headers: { 'content-type': 'application/json' },
        }),
    ) as unknown as typeof fetch;
    renderAs('admin');

    expect(await screen.findByText('boom')).toBeInTheDocument();
  });

  it('sends the real stage query param when the Stage filter changes', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ items: [lead('1')], nextCursor: null }));
    global.fetch = fetchMock as unknown as typeof fetch;
    renderAs('admin');
    await screen.findByText('Business 1');

    await userEvent.selectOptions(screen.getByLabelText('Filter by stage'), 'won');

    await waitFor(() => expect(lastFetchedUrl(fetchMock).searchParams.get('stage')).toBe('won'));
  });

  it('sends assignedTo=<current user id> when "Assigned to me" is checked — the only assigned-user filter the backend supports', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ items: [lead('1')], nextCursor: null }));
    global.fetch = fetchMock as unknown as typeof fetch;
    renderAs('admin');
    await screen.findByText('Business 1');

    await userEvent.click(screen.getByLabelText('Assigned to me'));

    await waitFor(() =>
      expect(lastFetchedUrl(fetchMock).searchParams.get('assignedTo')).toBe('member-1'),
    );
  });

  it('sends sort=businessName (whitelisted LEAD_SORT_FIELDS) when the Business column header is clicked', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ items: [lead('1')], nextCursor: null }));
    global.fetch = fetchMock as unknown as typeof fetch;
    renderAs('admin');
    await screen.findByText('Business 1');

    await userEvent.click(screen.getByRole('button', { name: /sort by business/i }));

    await waitFor(() =>
      expect(lastFetchedUrl(fetchMock).searchParams.get('sort')).toBe('businessName'),
    );
  });

  it('pages forward and back using the cursor the backend actually returns, not a page index', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = new URL(String(input));
      if (url.searchParams.get('cursor') === 'cursor-2') {
        return jsonResponse({ items: [lead('2')], nextCursor: null });
      }
      return jsonResponse({ items: [lead('1')], nextCursor: 'cursor-2' });
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    renderAs('admin');
    await screen.findByText('Business 1');

    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: /next/i }));
    await screen.findByText('Business 2');
    expect(lastFetchedUrl(fetchMock).searchParams.get('cursor')).toBe('cursor-2');

    await userEvent.click(screen.getByRole('button', { name: /previous/i }));
    await screen.findByText('Business 1');
    expect(lastFetchedUrl(fetchMock).searchParams.has('cursor')).toBe(false);
  });

  it('runs a bulk delete as N individual DELETE requests, not one atomic call', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'DELETE') {
        return new Response(null, { status: 204 });
      }
      return jsonResponse({ items: [lead('1'), lead('2')], nextCursor: null });
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    renderAs('admin');
    await screen.findByText('Business 1');

    const rowCheckboxes = screen.getAllByRole('checkbox', { name: 'Select row' });
    await userEvent.click(rowCheckboxes[0] as HTMLElement);
    await userEvent.click(rowCheckboxes[1] as HTMLElement);
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));

    const dialog = await screen.findByRole('alertdialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      const deleteCalls = fetchMock.mock.calls.filter(
        ([, init]) => (init as RequestInit | undefined)?.method === 'DELETE',
      );
      expect(deleteCalls).toHaveLength(2);
    });
  });

  it('hides row selection and bulk actions entirely for a role with neither leads:write nor leads:delete', async () => {
    global.fetch = vi.fn(async () =>
      jsonResponse({ items: [lead('1')], nextCursor: null }),
    ) as unknown as typeof fetch;
    renderAs('viewer');
    await screen.findByText('Business 1');

    expect(screen.queryAllByRole('checkbox', { name: 'Select row' })).toHaveLength(0);
  });
});
