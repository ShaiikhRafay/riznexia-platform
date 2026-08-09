import type { TeamRole } from '@riznexia/shared-types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PermissionsProvider } from '@/src/lib/permissions-context';
import { UserActivityPage } from './user-activity-page';

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => 'test-token' }),
}));

const { searchParams } = vi.hoisted(() => ({ searchParams: new URLSearchParams() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => searchParams,
  usePathname: () => '/analytics/activity',
}));

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

function envelope(byActor: unknown[]) {
  return {
    reportType: 'user_activity',
    generatedAt: '2026-01-01T00:00:00.000Z',
    period: 'monthly',
    filters: { fromDate: null, toDate: null },
    data: { byActor },
  };
}

function renderPage(role: TeamRole, body: unknown) {
  global.fetch = vi.fn(async () => jsonResponse(body)) as unknown as typeof fetch;
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <PermissionsProvider role={role}>
        <UserActivityPage />
      </PermissionsProvider>
    </QueryClientProvider>,
  );
}

describe('UserActivityPage', () => {
  it('lists real per-actor activity', async () => {
    renderPage(
      'admin',
      envelope([
        {
          actorId: 'member-1',
          actorName: 'Sheikh Abdullah',
          actionCount: 12,
          lastActiveAt: '2026-01-01T00:00:00.000Z',
        },
      ]),
    );
    expect(await screen.findByText('Sheikh Abdullah')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('shows an empty state when no activity is recorded', async () => {
    renderPage('admin', envelope([]));
    expect(await screen.findByText('No user activity recorded.')).toBeInTheDocument();
  });

  it('gates content on analytics:report (developer holds only analytics:view)', async () => {
    renderPage(
      'developer',
      envelope([
        { actorId: 'member-1', actorName: 'Sheikh Abdullah', actionCount: 1, lastActiveAt: null },
      ]),
    );
    expect(
      await screen.findByText(/don.t have permission to view full analytics reports/),
    ).toBeInTheDocument();
    expect(screen.queryByText('Sheikh Abdullah')).not.toBeInTheDocument();
  });
});
