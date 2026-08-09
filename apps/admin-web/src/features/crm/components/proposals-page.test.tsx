import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PermissionsProvider } from '@/src/lib/permissions-context';
import { ProposalsPage } from './proposals-page';

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => 'test-token' }),
}));

const { searchParams } = vi.hoisted(() => ({ searchParams: new URLSearchParams() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => searchParams,
}));

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

const PROPOSAL = {
  id: 'prop-1',
  leadId: 'lead-1',
  version: 2,
  content: 'Proposal text',
  status: 'sent_manually',
  sentAt: '2026-01-05T00:00:00.000Z',
  viewedAt: null,
  acceptedAt: null,
  rejectedAt: null,
  createdById: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-05T00:00:00.000Z',
};

// Proposals (F10): "Read-only tracking. Do not generate proposals. Do not
// edit proposal content unless backend supports it" — the backend has no
// content-editing endpoint at all, so no create/edit/status-change
// affordance should exist anywhere on this page, for any role.
describe('ProposalsPage', () => {
  it('displays Version/Status/Sent/Viewed/Accepted/Rejected with no interactive controls', async () => {
    searchParams.set('leadId', 'lead-1');
    global.fetch = vi.fn(async () =>
      jsonResponse({ items: [PROPOSAL], nextCursor: null }),
    ) as unknown as typeof fetch;
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <PermissionsProvider role="admin">
          <ProposalsPage />
        </PermissionsProvider>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Version 2')).toBeInTheDocument();
    expect(screen.getByText('Sent')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /edit|send|accept|reject|generate/i }),
    ).not.toBeInTheDocument();
  });
});
