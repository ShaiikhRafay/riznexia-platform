import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { Lead } from '@riznexia/shared-types';
import { describe, expect, it, vi } from 'vitest';
import { useBulkDeleteLeads } from './use-bulk-delete-leads';

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => 'test-token' }),
}));

function makeLead(id: string): Lead {
  return {
    id,
    businessId: id,
    businessName: `Business ${id}`,
    category: 'restaurant',
    city: 'Karachi',
    address: '123 Main St',
    websiteStatus: 'none',
    pipelineStage: 'new',
    assignedTo: null,
    tags: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

// Bulk selection (founder-approved resolution): there is no atomic bulk
// endpoint, so this hook runs one `DELETE /leads/:id` per row — a partial
// failure (some rows deleted, some not) is a real outcome this test
// proves is surfaced accurately, not hidden behind a fake all-or-nothing
// result.
describe('useBulkDeleteLeads', () => {
  it('counts succeeded and failed independently when some deletes fail', async () => {
    const leads = [makeLead('1'), makeLead('2'), makeLead('3')];
    global.fetch = vi.fn(async (url: string | URL) => {
      const id = String(url).split('/').pop();
      if (id === '2') {
        return new Response(
          JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'boom' } }),
          { status: 500 },
        );
      }
      return new Response(null, { status: 204 });
    }) as unknown as typeof fetch;

    const { result } = renderHook(() => useBulkDeleteLeads(), { wrapper });

    let outcome: { succeeded: number; failed: number } | undefined;
    await act(async () => {
      outcome = await result.current.mutateAsync(leads);
    });

    expect(outcome).toEqual({ succeeded: 2, failed: 1 });
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it('reports all succeeded when every delete succeeds', async () => {
    const leads = [makeLead('1'), makeLead('2')];
    global.fetch = vi.fn(
      async () => new Response(null, { status: 204 }),
    ) as unknown as typeof fetch;

    const { result } = renderHook(() => useBulkDeleteLeads(), { wrapper });

    await act(async () => {
      const outcome = await result.current.mutateAsync(leads);
      expect(outcome).toEqual({ succeeded: 2, failed: 0 });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
