import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDiscoveryJob } from './use-discovery-job';

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

// Discovery Progress (approved F3 architecture): status-based polling,
// not percentage-based. This proves the actual polling behavior end to
// end — keeps refetching every 3s while non-terminal, stops the instant
// the job reaches a terminal status — not just that isTerminalDiscoveryStatus()
// returns the right boolean in isolation. Uses fake timers throughout, and
// `vi.advanceTimersByTimeAsync` (which also flushes pending promise
// microtasks) rather than Testing Library's own `waitFor` — `waitFor`'s
// internal polling relies on the same faked `setTimeout`, which never
// advances on its own and deadlocks.
describe('useDiscoveryJob polling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps polling every 3s while the job is running, and stops once it completes', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          id: 'job-1',
          city: 'Karachi',
          category: 'restaurant',
          status: 'running',
          resultsCount: 0,
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          id: 'job-1',
          city: 'Karachi',
          category: 'restaurant',
          status: 'completed',
          resultsCount: 4,
        }),
      );
    global.fetch = fetchMock as unknown as typeof fetch;

    renderHook(() => useDiscoveryJob('job-1'), { wrapper });

    // Flush the initial fetch (fired on mount, before any timer advances).
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Still running — the 3s poll fires and picks up the "completed" response.
    await vi.advanceTimersByTimeAsync(3_000);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    // Now terminal — a further 3s must not trigger a third call.
    await vi.advanceTimersByTimeAsync(3_000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
