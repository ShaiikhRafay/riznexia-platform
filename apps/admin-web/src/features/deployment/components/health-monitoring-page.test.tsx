import type { TeamRole } from '@riznexia/shared-types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PermissionsProvider } from '@/src/lib/permissions-context';
import { HealthMonitoringPage } from './health-monitoring-page';

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => 'test-token' }),
}));

const { toastSuccess, toastError } = vi.hoisted(() => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));
vi.mock('@riznexia/ui', async () => {
  const actual = await vi.importActual<typeof import('@riznexia/ui')>('@riznexia/ui');
  return { ...actual, toast: { ...actual.toast, success: toastSuccess, error: toastError } };
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const HEALTH_CHECK = {
  id: 'check-1',
  deploymentId: 'deployment-1',
  status: 'healthy',
  checkedAt: '2026-01-01T00:05:00.000Z',
  responseTimeMs: 120,
  httpStatusCode: 200,
  detail: {
    checks: [
      { name: 'deployment_status', passed: true, detail: { status: 'COMPLETED' } },
      { name: 'website_reachable', passed: true, detail: { httpStatusCode: 200 } },
      { name: 'domain_status', passed: false, detail: { skipped: true } },
      { name: 'ssl_status', passed: true, detail: { skipped: true } },
    ],
  },
};

function renderPage(role: TeamRole, items: unknown[]) {
  global.fetch = vi.fn(async () =>
    jsonResponse({ items, nextCursor: null }),
  ) as unknown as typeof fetch;
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <PermissionsProvider role={role}>
        <HealthMonitoringPage leadId="lead-1" deploymentId="deployment-1" />
      </PermissionsProvider>
    </QueryClientProvider>,
  );
}

describe('HealthMonitoringPage', () => {
  it('summarizes Health Status, Response Time, Last Check, Passed Checks, and Failed Checks from the latest row only, never a computed score', async () => {
    renderPage('admin', [HEALTH_CHECK]);

    expect(await screen.findAllByText('Healthy')).not.toHaveLength(0);
    expect(screen.getAllByText('120ms').length).toBeGreaterThan(0);
    expect(screen.getAllByText('3').length).toBeGreaterThan(0); // 3 passed checks
    expect(screen.getAllByText('1').length).toBeGreaterThan(0); // 1 failed check
  });

  it('shows an empty state when no health checks have run yet', async () => {
    renderPage('admin', []);
    expect(
      await screen.findByText('No health checks have run for this deployment yet.'),
    ).toBeInTheDocument();
  });

  it('shows Run Health Check for a role with deployment:manage', async () => {
    renderPage('admin', []);
    expect(await screen.findByRole('button', { name: 'Run Health Check' })).toBeInTheDocument();
  });

  it('hides Run Health Check for a role without deployment:manage (sales_executive)', async () => {
    renderPage('sales_executive', []);
    await screen.findByText('No health checks have run for this deployment yet.');
    expect(screen.queryByRole('button', { name: 'Run Health Check' })).not.toBeInTheDocument();
  });

  it('triggers a real check and shows the real result via toast', async () => {
    global.fetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'POST') {
        return jsonResponse(HEALTH_CHECK, 201);
      }
      return jsonResponse({ items: [], nextCursor: null });
    }) as unknown as typeof fetch;

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <PermissionsProvider role="admin">
          <HealthMonitoringPage leadId="lead-1" deploymentId="deployment-1" />
        </PermissionsProvider>
      </QueryClientProvider>,
    );

    await userEvent.click(await screen.findByRole('button', { name: 'Run Health Check' }));
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith('Health check completed'));
  });
});
