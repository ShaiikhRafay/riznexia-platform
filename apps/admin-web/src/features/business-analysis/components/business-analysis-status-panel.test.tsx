import type { TeamRole } from '@riznexia/shared-types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PermissionsProvider } from '@/src/lib/permissions-context';
import { BusinessAnalysisStatusPanel } from './business-analysis-status-panel';

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => 'test-token' }),
}));

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

function renderAs(role: TeamRole, response: unknown) {
  global.fetch = vi.fn(async () => jsonResponse(response)) as unknown as typeof fetch;
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <PermissionsProvider role={role}>
        <BusinessAnalysisStatusPanel leadId="lead-1" businessName="Joe's Diner" />
      </PermissionsProvider>
    </QueryClientProvider>,
  );
}

describe('BusinessAnalysisStatusPanel', () => {
  it('shows "no analysis yet" when GET /leads/:id/business returns null', async () => {
    renderAs('admin', null);
    expect(
      await screen.findByText('No analysis has been run for this lead yet.'),
    ).toBeInTheDocument();
  });

  it('shows version, provider, model, and a completed execution summary for a completed analysis', async () => {
    renderAs('admin', {
      id: 'analysis-1',
      businessId: 'business-1',
      analysisVersion: 3,
      promptName: 'brand-brief-v1',
      promptVersion: '1.0.0',
      aiProvider: 'claude',
      aiModel: 'claude-sonnet-5',
      status: 'completed',
      brandBrief: null,
      confidenceScore: 0.9,
      validationErrors: null,
      executionTimeMs: 4200,
      completedAt: '2026-01-01T00:00:05.000Z',
      promptTokens: 100,
      completionTokens: 200,
      totalTokens: 300,
      estimatedCost: 0.02,
      createdAt: '2026-01-01T00:00:00.000Z',
    });

    expect(await screen.findByText('3')).toBeInTheDocument();
    expect(screen.getByText('claude')).toBeInTheDocument();
    expect(screen.getByText('claude-sonnet-5')).toBeInTheDocument();
    expect(screen.getByText('Completed in 4.2s')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View full details' })).toHaveAttribute(
      'href',
      '/business-analysis/lead-1',
    );
  });

  it('shows a "waiting" execution message while pending', async () => {
    renderAs('admin', {
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
    });

    expect(await screen.findByText('Waiting for the AI provider to respond…')).toBeInTheDocument();
  });
});
