import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useLeadCrm } from './use-lead-crm';

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => 'test-token' }),
}));

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

const LEAD_CRM = {
  id: 'crm-1',
  leadId: 'lead-1',
  stageId: 'stage-1',
  dealValueUsd: 5000,
  lostReasonId: null,
  ownerId: null,
  nextFollowUpAt: null,
  lastActivityAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

// `GET /leads/:id/crm` is a lazy get-or-create on the backend — it never
// returns null, unlike M6-M9's own GET hooks. No polling: a single fetch
// is always sufficient.
describe('useLeadCrm', () => {
  it('resolves to the full LeadCRM in a single fetch, with no polling', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(LEAD_CRM));
    global.fetch = fetchMock as unknown as typeof fetch;

    const { result } = renderHook(() => useLeadCrm('lead-1'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.stageId).toBe('stage-1');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
