import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useBusinessAnalysis } from './use-business-analysis';

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => 'test-token' }),
}));

function analysis(overrides: Partial<Record<string, unknown>>) {
  return {
    id: 'analysis-1',
    businessId: 'business-1',
    analysisVersion: 1,
    promptName: 'brand-brief-v1',
    promptVersion: '1.0.0',
    aiProvider: 'claude',
    aiModel: 'claude-sonnet-5',
    status: 'pending',
    brandBrief: null,
    confidenceScore: null,
    validationErrors: null,
    executionTimeMs: null,
    completedAt: null,
    promptTokens: null,
    completionTokens: null,
    totalTokens: null,
    estimatedCost: null,
    createdAt: '2026-01-01T00:00:00.000Z',
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

// Polling (F6): the AI call is fire-and-forget from POST's perspective —
// `GET /leads/:id/business` starts returning `pending` and must be
// polled until the async runner flips it to a terminal status. Same
// fake-timers proof pattern as F3/F5's polling hooks.
describe('useBusinessAnalysis polling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps polling every 3s while pending, and stops once it completes', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(analysis({ status: 'pending' })))
      .mockResolvedValueOnce(
        jsonResponse(analysis({ status: 'completed', completedAt: '2026-01-01T00:00:05.000Z' })),
      );
    global.fetch = fetchMock as unknown as typeof fetch;

    renderHook(() => useBusinessAnalysis('lead-1'), { wrapper });

    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(3_000);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(3_000);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('does not poll at all when the backend already returns a terminal result (a cache hit)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(analysis({ status: 'completed' })));
    global.fetch = fetchMock as unknown as typeof fetch;

    renderHook(() => useBusinessAnalysis('lead-1'), { wrapper });

    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(3_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
