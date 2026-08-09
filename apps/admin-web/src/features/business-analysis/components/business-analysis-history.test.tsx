import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BusinessAnalysisHistory } from './business-analysis-history';

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => 'test-token' }),
}));

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

function renderHistory(response: unknown) {
  global.fetch = vi.fn(async () => jsonResponse(response)) as unknown as typeof fetch;
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <BusinessAnalysisHistory leadId="lead-1" />
    </QueryClientProvider>,
  );
}

// Analysis History (F6): the backend has no history/versions endpoint —
// only the single latest analysis is ever retrievable — so this page
// shows exactly one row with an explicit note, never a fabricated list.
describe('BusinessAnalysisHistory', () => {
  it('shows the single latest analysis with an explicit note about why there is only one row', async () => {
    renderHistory({
      id: 'analysis-1',
      businessId: 'business-1',
      analysisVersion: 4,
      promptName: 'brand-brief-v1',
      promptVersion: '1.0.0',
      aiProvider: 'claude',
      aiModel: 'claude-sonnet-5',
      status: 'completed',
      brandBrief: null,
      confidenceScore: null,
      validationErrors: null,
      executionTimeMs: null,
      completedAt: '2026-01-02T00:00:00.000Z',
      promptTokens: null,
      completionTokens: null,
      totalTokens: null,
      estimatedCost: null,
      createdAt: '2026-01-01T00:00:00.000Z',
    });

    expect(await screen.findByText('Version 4')).toBeInTheDocument();
    expect(
      screen.getByText(/The backend only retains the latest analysis per lead/),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View Details' })).toHaveAttribute(
      'href',
      '/business-analysis/lead-1',
    );
  });

  it('shows a plain message when no analysis has ever been run', async () => {
    renderHistory(null);
    expect(
      await screen.findByText('No analysis has ever been run for this lead.'),
    ).toBeInTheDocument();
  });
});
