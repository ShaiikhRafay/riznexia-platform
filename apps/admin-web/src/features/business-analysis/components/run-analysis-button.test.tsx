import type { TeamRole } from '@riznexia/shared-types';
import { Toaster } from '@riznexia/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PermissionsProvider } from '@/src/lib/permissions-context';
import { RunAnalysisButton } from './run-analysis-button';

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => 'test-token' }),
}));

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

function renderButton(role: TeamRole, hasExistingAnalysis = false) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <PermissionsProvider role={role}>
        <RunAnalysisButton leadId="lead-1" hasExistingAnalysis={hasExistingAnalysis} />
        <Toaster />
      </PermissionsProvider>
    </QueryClientProvider>,
  );
}

const PENDING_ANALYSIS = {
  id: 'analysis-1',
  businessId: 'business-1',
  analysisVersion: 2,
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
};

// Run/Re-run Analysis (F6): one mutation, one button whose label changes
// based on whether an analysis already exists — the backend never
// distinguishes "run" from "re-run" itself (DECISIONS.md).
describe('RunAnalysisButton', () => {
  it('labels itself "Run AI Analysis" when no analysis exists yet', () => {
    renderButton('admin', false);
    expect(screen.getByRole('button', { name: 'Run AI Analysis' })).toBeInTheDocument();
  });

  it('labels itself "Re-run Analysis" when one already exists', () => {
    renderButton('admin', true);
    expect(screen.getByRole('button', { name: 'Re-run Analysis' })).toBeInTheDocument();
  });

  it('is hidden entirely for a role without business:analyze (developer)', () => {
    renderButton('developer', false);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('is hidden entirely for viewer', () => {
    renderButton('viewer', false);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows a "started" toast on a cache miss (response comes back pending)', async () => {
    global.fetch = vi.fn(async () => jsonResponse(PENDING_ANALYSIS)) as unknown as typeof fetch;
    renderButton('admin', false);

    await userEvent.click(screen.getByRole('button', { name: 'Run AI Analysis' }));

    expect(await screen.findByText('Analysis started.')).toBeInTheDocument();
  });

  it('shows a "cached" toast on a cache hit (response comes back already completed)', async () => {
    global.fetch = vi.fn(async () =>
      jsonResponse({ ...PENDING_ANALYSIS, status: 'completed' }),
    ) as unknown as typeof fetch;
    renderButton('admin', true);

    await userEvent.click(screen.getByRole('button', { name: 'Re-run Analysis' }));

    expect(await screen.findByText(/Already up to date/)).toBeInTheDocument();
  });

  it('shows the backend error message verbatim on failure', async () => {
    global.fetch = vi.fn(async () =>
      errorResponse('Rate limit exceeded', 429),
    ) as unknown as typeof fetch;
    renderButton('admin', false);

    await userEvent.click(screen.getByRole('button', { name: 'Run AI Analysis' }));

    expect(await screen.findByText('Rate limit exceeded')).toBeInTheDocument();
  });
});

function errorResponse(message: string, status: number) {
  return new Response(JSON.stringify({ error: { code: 'RATE_LIMITED', message } }), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
