import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PlaceSyncJobDetail } from './place-sync-job-detail';

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
    status: 'completed',
    startedAt: '2026-01-01T00:00:00.000Z',
    finishedAt: '2026-01-01T00:05:00.000Z',
    duration: 300,
    successRate: 1,
    apiCallsUsed: 5,
    estimatedCost: 0.05,
    businessesFound: 10,
    businessesCreated: 8,
    businessesUpdated: 2,
    businessesFailed: 0,
    errorMessage: null,
    ...overrides,
  };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function renderDetail(response: unknown, status = 200) {
  global.fetch = vi.fn(async () => jsonResponse(response, status)) as unknown as typeof fetch;
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <PlaceSyncJobDetail jobId="job-1" />
    </QueryClientProvider>,
  );
}

// Sync Job Details (F5): displays only backend-returned fields. There is
// no "Current Page Token" section anywhere — no such field is ever
// returned by GET /place-sync-jobs/:id — and "Processed Count" is a
// computed sum of the three real counters, never a fabricated field.
describe('PlaceSyncJobDetail', () => {
  it('renders Job Status, Search Parameters, Counts, and Timeline from real fields, with no Current Page Token section', async () => {
    renderDetail(job({}));

    expect(await screen.findByRole('heading', { name: 'Karachi' })).toBeInTheDocument();
    expect(screen.getByText('restaurant')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument(); // Processed Count = 8 + 2 + 0
    expect(screen.getByText('8')).toBeInTheDocument(); // Imported
    expect(screen.getByText('2')).toBeInTheDocument(); // Updated
    expect(screen.getByText('300s')).toBeInTheDocument(); // Duration
    expect(screen.queryByText(/page token/i)).not.toBeInTheDocument();
  });

  it('shows the Error Message field only when the backend actually returns one', async () => {
    renderDetail(
      job({
        status: 'failed',
        errorMessage: 'Places API quota exceeded',
        businessesCreated: 0,
        businessesUpdated: 0,
      }),
    );

    expect(await screen.findByText('Places API quota exceeded')).toBeInTheDocument();
  });

  it('hides the Error Message field entirely for a job with no error', async () => {
    renderDetail(job({}));

    await screen.findByRole('heading', { name: 'Karachi' });
    expect(screen.queryByText('Error Message')).not.toBeInTheDocument();
  });

  it('derives Last Updated from finishedAt for a terminal job (also shown as Completed At in the Timeline)', async () => {
    renderDetail(job({ finishedAt: '2026-01-01T00:05:00.000Z' }));
    await screen.findByRole('heading', { name: 'Karachi' });

    // Appears twice by design: once as "Last Updated" (Job Status) and
    // once as "Completed At" (Timeline) — both are the same real
    // `finishedAt` value, not a duplicate bug.
    expect(screen.getAllByText(new Date('2026-01-01T00:05:00.000Z').toLocaleString())).toHaveLength(
      2,
    );
  });

  it('derives Last Updated from startedAt when the job is still running (no finishedAt yet)', async () => {
    renderDetail(
      job({
        status: 'running',
        startedAt: '2026-01-01T00:00:00.000Z',
        finishedAt: null,
        duration: null,
        businessesCreated: 0,
        businessesUpdated: 0,
      }),
    );
    await screen.findByRole('heading', { name: 'Karachi' });

    // Also appears twice: "Last Updated" (Job Status) and "Started At"
    // (Timeline) share the same real `startedAt` value.
    expect(screen.getAllByText(new Date('2026-01-01T00:00:00.000Z').toLocaleString())).toHaveLength(
      2,
    );
  });

  it('shows "No activity yet" for a still-queued job with neither timestamp', async () => {
    renderDetail(
      job({
        status: 'queued',
        startedAt: null,
        finishedAt: null,
        duration: null,
        businessesCreated: 0,
        businessesUpdated: 0,
      }),
    );
    await screen.findByRole('heading', { name: 'Karachi' });

    expect(screen.getByText('No activity yet')).toBeInTheDocument();
  });

  it('shows an inline ErrorState on a 404 (unknown job id)', async () => {
    renderDetail(
      { error: { code: 'RESOURCE_NOT_FOUND', message: 'Place sync job not found' } },
      404,
    );

    expect(await screen.findByText('Place sync job not found')).toBeInTheDocument();
  });
});
