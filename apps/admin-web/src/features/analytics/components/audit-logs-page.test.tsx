import type { TeamRole } from '@riznexia/shared-types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PermissionsProvider } from '@/src/lib/permissions-context';
import { AuditLogsPage } from './audit-logs-page';

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => 'test-token' }),
}));

const { searchParams } = vi.hoisted(() => ({ searchParams: new URLSearchParams() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => searchParams,
  usePathname: () => '/analytics/audit',
}));

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

function envelope(items: unknown[], nextCursor: string | null = null) {
  return {
    reportType: 'audit',
    generatedAt: '2026-01-01T00:00:00.000Z',
    period: 'monthly',
    filters: { fromDate: null, toDate: null },
    data: { items, nextCursor },
  };
}

const ENTRY = {
  id: 'audit-1',
  actorId: 'member-1',
  action: 'deployment.domain_registered',
  entityType: 'Domain',
  entityId: 'domain-1',
  createdAt: '2026-01-01T00:00:00.000Z',
};

function renderPage(role: TeamRole, body: unknown) {
  global.fetch = vi.fn(async () => jsonResponse(body)) as unknown as typeof fetch;
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <PermissionsProvider role={role}>
        <AuditLogsPage />
      </PermissionsProvider>
    </QueryClientProvider>,
  );
}

describe('AuditLogsPage', () => {
  it('lists real audit entries in a real paginated DataTable', async () => {
    renderPage('admin', envelope([ENTRY]));
    expect(await screen.findByText('deployment.domain_registered')).toBeInTheDocument();
    expect(screen.getByText('Domain')).toBeInTheDocument();
    expect(screen.getByText('domain-1')).toBeInTheDocument();
  });

  it('shows an empty state when no audit entries exist', async () => {
    renderPage('admin', envelope([]));
    expect(await screen.findByText('No audit entries found')).toBeInTheDocument();
  });

  it('gates the entire table on analytics:report (viewer holds only analytics:view)', async () => {
    renderPage('viewer', envelope([ENTRY]));
    expect(
      await screen.findByText(/don.t have permission to view full analytics reports/),
    ).toBeInTheDocument();
    expect(screen.queryByText('deployment.domain_registered')).not.toBeInTheDocument();
  });
});
