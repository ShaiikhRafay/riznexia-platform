import type { TeamRole } from '@riznexia/shared-types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PermissionsProvider } from '@/src/lib/permissions-context';
import { PlaceSyncDashboardPage } from './place-sync-dashboard-page';

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => 'test-token' }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
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
        <PlaceSyncDashboardPage />
      </PermissionsProvider>
    </QueryClientProvider>,
  );
}

// Permissions (F5): discovery:run gates the New Synchronization form,
// discovery:read (universal — every role holds it) gates nothing on the
// latest-status panel, matching the approved F3 architecture's reuse of
// these exact two permissions.
describe('PlaceSyncDashboardPage', () => {
  it('shows New Synchronization for sales_executive (holds discovery:run)', () => {
    renderAs('sales_executive');
    expect(screen.getByText('New Synchronization')).toBeInTheDocument();
  });

  it('shows New Synchronization for admin', () => {
    renderAs('admin');
    expect(screen.getByText('New Synchronization')).toBeInTheDocument();
  });

  it('hides New Synchronization for developer (no discovery:run), but still shows the latest status panel', async () => {
    renderAs('developer');
    expect(screen.queryByText('New Synchronization')).not.toBeInTheDocument();
    expect(await screen.findByText('Latest Synchronization')).toBeInTheDocument();
  });

  it('hides New Synchronization for viewer (no discovery:run)', () => {
    renderAs('viewer');
    expect(screen.queryByText('New Synchronization')).not.toBeInTheDocument();
  });
});
