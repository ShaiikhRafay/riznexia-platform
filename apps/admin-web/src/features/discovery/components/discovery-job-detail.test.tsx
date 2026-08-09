import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DiscoveryJobDetail } from './discovery-job-detail';

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => 'test-token' }),
}));

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function renderDetail(jobId = 'job-1') {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <DiscoveryJobDetail jobId={jobId} />
    </QueryClientProvider>,
  );
}

describe('DiscoveryJobDetail', () => {
  it('renders only the fields GET /discovery-jobs/:id actually returns — city, category, status, resultsCount', async () => {
    global.fetch = vi.fn(async () =>
      jsonResponse({
        id: 'job-1',
        city: 'Karachi',
        category: 'restaurant',
        status: 'completed',
        resultsCount: 9,
      }),
    ) as unknown as typeof fetch;

    renderDetail();

    expect(await screen.findByRole('heading', { name: /Karachi.*restaurant/ })).toBeInTheDocument();
    expect(screen.getByText('9')).toBeInTheDocument();
  });

  it('shows an inline ErrorState on a 404 (unknown job id), with a link back to Discovery', async () => {
    global.fetch = vi.fn(async () =>
      jsonResponse(
        { error: { code: 'RESOURCE_NOT_FOUND', message: 'Discovery job not found' } },
        404,
      ),
    ) as unknown as typeof fetch;

    renderDetail('unknown-job');

    expect(await screen.findByText('Discovery job not found')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Back to Discovery/ })).toHaveAttribute(
      'href',
      '/discovery',
    );
  });

  it('does not render an Import Summary while the job is still running', async () => {
    global.fetch = vi.fn(async () =>
      jsonResponse({
        id: 'job-1',
        city: 'Karachi',
        category: 'restaurant',
        status: 'running',
        resultsCount: 0,
      }),
    ) as unknown as typeof fetch;

    renderDetail();

    await screen.findByRole('heading', { name: /Karachi.*restaurant/ });
    expect(screen.queryByText('Import Summary')).not.toBeInTheDocument();
  });
});
