import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useTransitionStageAny } from './use-transition-stage-any';

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
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

// Pipeline Board's own transition hook — one hook instance backs every
// card, with `leadId` traveling as part of the mutate call rather than
// bound at hook-call time (avoids calling a hook once per card, which
// would violate the Rules of Hooks as the board's lead set changes).
describe('useTransitionStageAny', () => {
  it('posts to the real per-lead stage endpoint with the given leadId', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        id: 'crm-1',
        leadId: 'lead-1',
        stageId: 'stage-2',
        dealValueUsd: null,
        lostReasonId: null,
        ownerId: null,
        nextFollowUpAt: null,
        lastActivityAt: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const { result } = renderHook(() => useTransitionStageAny(), { wrapper });
    result.current.mutate({ leadId: 'lead-1', stageId: 'stage-2' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/leads/lead-1/crm/stage'),
      expect.objectContaining({ method: 'POST', body: JSON.stringify({ stageId: 'stage-2' }) }),
    );
  });
});
