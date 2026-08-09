import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PlaceSyncLatestStatus } from './place-sync-latest-status';

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => 'test-token' }),
}));

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

function renderStatus() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <PlaceSyncLatestStatus />
    </QueryClientProvider>,
  );
}

describe('PlaceSyncLatestStatus', () => {
  it('shows the most recent job (first item — GET /place-sync-jobs is already createdAt desc) with its real counts', async () => {
    global.fetch = vi.fn(async () =>
      jsonResponse([
        {
          id: 'job-2',
          provider: 'google',
          city: 'Lahore',
          category: 'clinic',
          keyword: null,
          latitude: null,
          longitude: null,
          radiusMeters: 15000,
          status: 'completed',
          startedAt: '2026-01-02T00:00:00.000Z',
          finishedAt: '2026-01-02T00:05:00.000Z',
          duration: 300,
          successRate: 1,
          apiCallsUsed: 3,
          estimatedCost: 0.02,
          businessesFound: 5,
          businessesCreated: 4,
          businessesUpdated: 1,
          businessesFailed: 0,
          errorMessage: null,
        },
      ]),
    ) as unknown as typeof fetch;

    renderStatus();

    expect(await screen.findByText(/Found 5/)).toBeInTheDocument();
    expect(screen.getByText(/Created 4/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View details' })).toHaveAttribute(
      'href',
      '/discovery/sync/job-2',
    );
  });

  it('shows a plain message when no synchronizations have run yet', async () => {
    global.fetch = vi.fn(async () => jsonResponse([])) as unknown as typeof fetch;
    renderStatus();

    expect(await screen.findByText('No synchronizations have been run yet.')).toBeInTheDocument();
  });

  it('shows an inline error state on a failed fetch', async () => {
    global.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'boom' } }), {
          status: 500,
          headers: { 'content-type': 'application/json' },
        }),
    ) as unknown as typeof fetch;
    renderStatus();

    expect(await screen.findByText('boom')).toBeInTheDocument();
  });
});
