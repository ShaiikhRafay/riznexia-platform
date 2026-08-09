import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePlaceSyncJob } from './use-place-sync-job';

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => 'test-token' }),
}));

function job(overrides: Partial<Record<string, unknown>>) {
  return {
    id: 'job-1',
    provider: 'google',
    city: 'Karachi',
    category: 'restaurant',
    keyword: null,
    latitude: null,
    longitude: null,
    radiusMeters: 15000,
    status: 'running',
    startedAt: '2026-01-01T00:00:00.000Z',
    finishedAt: null,
    duration: null,
    successRate: null,
    apiCallsUsed: 1,
    estimatedCost: 0.01,
    businessesFound: 0,
    businessesCreated: 0,
    businessesUpdated: 0,
    businessesFailed: 0,
    errorMessage: null,
    ...overrides,
  };
}

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

// Progress (F5 scope): proves the actual poll-every-3s-then-stop behavior
// end to end, including the `partial` terminal outcome — a status
// Discovery Jobs never had — not just that isTerminalPlaceSyncStatus()
// returns the right boolean in isolation. Same fake-timers approach as
// F3's use-discovery-job.test.tsx (vi.advanceTimersByTimeAsync flushes
// pending microtasks; Testing Library's waitFor would deadlock against
// the same faked setTimeout).
describe('usePlaceSyncJob polling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps polling every 3s while running, and stops once it completes', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(job({ status: 'running' })))
      .mockResolvedValueOnce(
        jsonResponse(job({ status: 'completed', finishedAt: '2026-01-01T00:05:00.000Z' })),
      );
    global.fetch = fetchMock as unknown as typeof fetch;

    renderHook(() => usePlaceSyncJob('job-1'), { wrapper });

    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(3_000);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(3_000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('stops polling once the job reaches partial — a real terminal outcome distinct from completed/failed', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(job({ status: 'running' })))
      .mockResolvedValueOnce(
        jsonResponse(
          job({ status: 'partial', finishedAt: '2026-01-01T00:05:00.000Z', businessesFailed: 2 }),
        ),
      );
    global.fetch = fetchMock as unknown as typeof fetch;

    renderHook(() => usePlaceSyncJob('job-1'), { wrapper });

    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(3_000);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(3_000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
