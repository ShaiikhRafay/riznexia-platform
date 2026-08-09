import type { TeamRole } from '@riznexia/shared-types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CurrentUserProvider } from '@/src/lib/current-user-context';
import { PermissionsProvider } from '@/src/lib/permissions-context';
import { LeadListPage } from './lead-list-page';

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => 'test-token' }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

function renderAs(role: TeamRole) {
  global.fetch = vi.fn(async () =>
    jsonResponse({ items: [], nextCursor: null }),
  ) as unknown as typeof fetch;
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <CurrentUserProvider
        currentUser={{ id: 'member-1', name: 'Jane Rep', email: 'jane@riznexia.com', role }}
      >
        <PermissionsProvider role={role}>
          <LeadListPage />
        </PermissionsProvider>
      </CurrentUserProvider>
    </QueryClientProvider>,
  );
}

describe('LeadListPage', () => {
  it('shows Create Lead for sales_executive (holds leads:write)', () => {
    renderAs('sales_executive');
    expect(screen.getByRole('link', { name: /Create Lead/ })).toHaveAttribute('href', '/leads/new');
  });

  it('hides Create Lead for viewer (no leads:write)', () => {
    renderAs('viewer');
    expect(screen.queryByRole('link', { name: /Create Lead/ })).not.toBeInTheDocument();
  });

  it('hides Create Lead for developer (no leads:write)', () => {
    renderAs('developer');
    expect(screen.queryByRole('link', { name: /Create Lead/ })).not.toBeInTheDocument();
  });
});
