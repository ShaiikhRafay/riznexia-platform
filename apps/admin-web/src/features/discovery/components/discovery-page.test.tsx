import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import type { TeamRole } from '@riznexia/shared-types';
import { describe, expect, it, vi } from 'vitest';
import { PermissionsProvider } from '@/src/lib/permissions-context';
import { DiscoveryPage } from './discovery-page';

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => 'test-token' }),
}));

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

function renderAs(role: TeamRole) {
  global.fetch = vi.fn(async () => jsonResponse([])) as unknown as typeof fetch;
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <PermissionsProvider role={role}>
        <DiscoveryPage />
      </PermissionsProvider>
    </QueryClientProvider>,
  );
}

// Permission model (approved F3 architecture): discovery:read for
// viewing (universal — every role has it), discovery:run for creating
// jobs (withheld from developer/viewer).
describe('DiscoveryPage', () => {
  it('shows the New Search form for sales_executive (holds discovery:run)', () => {
    renderAs('sales_executive');
    expect(screen.getByText('New Search')).toBeInTheDocument();
  });

  it('shows the New Search form for admin', () => {
    renderAs('admin');
    expect(screen.getByText('New Search')).toBeInTheDocument();
  });

  it('hides the New Search form for developer (no discovery:run), but still shows history', async () => {
    renderAs('developer');
    expect(screen.queryByText('New Search')).not.toBeInTheDocument();
    expect(await screen.findByText('Discovery History')).toBeInTheDocument();
  });

  it('hides the New Search form for viewer (no discovery:run)', () => {
    renderAs('viewer');
    expect(screen.queryByText('New Search')).not.toBeInTheDocument();
  });
});
