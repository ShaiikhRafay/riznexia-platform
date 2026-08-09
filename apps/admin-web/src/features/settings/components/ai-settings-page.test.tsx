import type { TeamRole } from '@riznexia/shared-types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PermissionsProvider } from '@/src/lib/permissions-context';
import { AiSettingsPage } from './ai-settings-page';

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => 'test-token' }),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/settings/ai',
}));

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

const ENVELOPE = {
  reportType: 'ai_usage',
  generatedAt: '2026-01-01T00:00:00.000Z',
  period: 'monthly',
  filters: { fromDate: null, toDate: null },
  data: {
    totalAnalyses: 42,
    totalTokens: 128000,
    byModel: [{ aiModel: 'claude-sonnet-5', count: 42, totalTokens: 128000 }],
    byStatus: [{ label: 'completed', count: 42 }],
    averageExecutionTimeMs: 2200,
  },
};

function renderPage(role: TeamRole) {
  global.fetch = vi.fn(async () => jsonResponse(ENVELOPE)) as unknown as typeof fetch;
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <PermissionsProvider role={role}>
        <AiSettingsPage />
      </PermissionsProvider>
    </QueryClientProvider>,
  );
}

describe('AiSettingsPage', () => {
  it('shows real AI usage stats and marks unconfigurable model settings as Not available', async () => {
    renderPage('admin');
    expect(await screen.findByText('claude-sonnet-5')).toBeInTheDocument();
    expect(screen.getByText('Default AI Provider')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /View AI Budget/ })).toHaveAttribute(
      'href',
      '/settings/cost-budget',
    );
  });

  it('blocks the whole page for a role without team:manage', async () => {
    renderPage('viewer');
    expect(await screen.findByText(/don.t have permission to view settings/)).toBeInTheDocument();
  });
});
