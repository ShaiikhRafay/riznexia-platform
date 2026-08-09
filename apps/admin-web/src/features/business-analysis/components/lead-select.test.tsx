import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LeadSelect } from './lead-select';

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => 'test-token' }),
}));

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

function renderSelect(onChange = vi.fn()) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <LeadSelect value={null} onChange={onChange} />
    </QueryClientProvider>,
  );
  return onChange;
}

// Select Lead (F6 Dashboard feature): reuses F4's real `GET /leads?q=`
// endpoint directly, not a second leads-fetching implementation.
describe('LeadSelect', () => {
  it('shows matching leads after typing 2+ characters (matches listLeadsQuerySchema.q.min(2))', async () => {
    global.fetch = vi.fn(async () =>
      jsonResponse({
        items: [{ id: 'lead-1', businessName: "Joe's Diner", city: 'Karachi' }],
        nextCursor: null,
      }),
    ) as unknown as typeof fetch;
    renderSelect();

    await userEvent.type(screen.getByLabelText('Search leads'), 'Joe');

    expect(await screen.findByText("Joe's Diner")).toBeInTheDocument();
    expect(screen.getByText('Karachi')).toBeInTheDocument();
  });

  it('does not query for a single character', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ items: [], nextCursor: null }));
    global.fetch = fetchMock as unknown as typeof fetch;
    renderSelect();

    await userEvent.type(screen.getByLabelText('Search leads'), 'J');

    await waitFor(() => expect(fetchMock).not.toHaveBeenCalled(), { timeout: 500 });
  });

  it('calls onChange with the lead id and business name when a result is clicked', async () => {
    global.fetch = vi.fn(async () =>
      jsonResponse({
        items: [{ id: 'lead-1', businessName: "Joe's Diner", city: 'Karachi' }],
        nextCursor: null,
      }),
    ) as unknown as typeof fetch;
    const onChange = renderSelect();

    await userEvent.type(screen.getByLabelText('Search leads'), 'Joe');
    await userEvent.click(await screen.findByText("Joe's Diner"));

    expect(onChange).toHaveBeenCalledWith('lead-1', "Joe's Diner");
  });

  it('shows a no-results message when nothing matches', async () => {
    global.fetch = vi.fn(async () =>
      jsonResponse({ items: [], nextCursor: null }),
    ) as unknown as typeof fetch;
    renderSelect();

    await userEvent.type(screen.getByLabelText('Search leads'), 'zzz');

    expect(await screen.findByText('No leads match “zzz”.')).toBeInTheDocument();
  });
});
