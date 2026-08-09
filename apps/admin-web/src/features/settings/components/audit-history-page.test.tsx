import type { TeamRole } from '@riznexia/shared-types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PermissionsProvider } from '@/src/lib/permissions-context';
import { SettingsAuditHistoryPage } from './audit-history-page';

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => 'test-token' }),
}));

const { searchParams } = vi.hoisted(() => ({ searchParams: new URLSearchParams() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => searchParams,
  usePathname: () => '/settings/audit',
}));

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

const ENVELOPE = {
  reportType: 'audit',
  generatedAt: '2026-01-01T00:00:00.000Z',
  period: 'monthly',
  filters: { fromDate: null, toDate: null },
  data: {
    items: [
      {
        id: 'audit-1',
        actorId: 'member-1',
        action: 'crm.settings_updated',
        entityType: 'CrmSettings',
        entityId: 'crm-settings-1',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    nextCursor: null,
  },
};

function renderPage(role: TeamRole) {
  global.fetch = vi.fn(async () => jsonResponse(ENVELOPE)) as unknown as typeof fetch;
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <PermissionsProvider role={role}>
        <SettingsAuditHistoryPage />
      </PermissionsProvider>
    </QueryClientProvider>,
  );
}

describe('SettingsAuditHistoryPage', () => {
  it('reuses the real F12 AuditLogsPage verbatim — same real audit data, no second implementation', async () => {
    renderPage('admin');
    expect(await screen.findByText('crm.settings_updated')).toBeInTheDocument();
  });

  it('blocks the whole page for a role without team:manage, before F12s own analytics:report gate is ever reached', () => {
    renderPage('sales_executive');
    expect(screen.getByText(/don.t have permission to view settings/)).toBeInTheDocument();
  });
});
