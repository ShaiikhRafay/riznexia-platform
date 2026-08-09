import type { TeamRole } from '@riznexia/shared-types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PermissionsProvider } from '@/src/lib/permissions-context';
import { DeploymentStatusPanel } from './deployment-status-panel';

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => 'test-token' }),
}));

const { toastError } = vi.hoisted(() => ({ toastError: vi.fn() }));
vi.mock('@riznexia/ui', async () => {
  const actual = await vi.importActual<typeof import('@riznexia/ui')>('@riznexia/ui');
  return { ...actual, toast: { ...actual.toast, error: toastError, success: vi.fn() } };
});

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const DEPLOYMENT = {
  id: 'deployment-1',
  businessId: 'business-1',
  generatedWebsiteId: 'website-1',
  generatedWebsiteVersion: 1,
  deploymentVersion: 3,
  provider: 'vercel',
  providerVersion: 'v1.0',
  providerDeploymentId: 'dpl_1',
  environment: 'production',
  commitHash: null,
  status: 'completed',
  healthStatus: 'healthy',
  liveUrl: 'https://joes-diner.vercel.app',
  errorMessage: null,
  deploymentHash: 'abc',
  deploymentEngineVersion: 'v1.0',
  rollbackFromDeploymentId: null,
  retryOfDeploymentId: null,
  buildStartedAt: '2026-01-01T00:00:00.000Z',
  buildCompletedAt: '2026-01-01T00:01:00.000Z',
  completedAt: '2026-01-01T00:01:00.000Z',
  executionDuration: 60000,
  createdById: 'member-1',
  createdAt: '2026-01-01T00:00:00.000Z',
};

function renderPanel(role: TeamRole, snapshot: unknown) {
  global.fetch = vi.fn(async () => jsonResponse(snapshot)) as unknown as typeof fetch;

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <PermissionsProvider role={role}>
        <DeploymentStatusPanel leadId="lead-1" businessName="Joe's Diner" />
      </PermissionsProvider>
    </QueryClientProvider>,
  );
}

describe('DeploymentStatusPanel', () => {
  it('shows "no deployment yet" when latestDeployment is null', async () => {
    renderPanel('admin', {
      generatedAt: '2026-01-01T00:00:00Z',
      leadId: 'lead-1',
      latestDeployment: null,
      domain: null,
      productionReady: false,
    });
    expect(
      await screen.findByText('No deployment has been requested for this lead yet.'),
    ).toBeInTheDocument();
  });

  it('displays Deployment Status, Provider, Environment, Current Version, and Latest Health Status exactly as returned', async () => {
    renderPanel('admin', {
      generatedAt: '2026-01-01T00:00:00Z',
      leadId: 'lead-1',
      latestDeployment: DEPLOYMENT,
      domain: null,
      productionReady: true,
    });

    expect(await screen.findByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('Vercel')).toBeInTheDocument();
    expect(screen.getByText('production')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Healthy')).toBeInTheDocument();
    expect(screen.getByText('Yes')).toBeInTheDocument();
  });

  it('shows the Deploy button for a role with deployment:create', async () => {
    renderPanel('admin', {
      generatedAt: '2026-01-01T00:00:00Z',
      leadId: 'lead-1',
      latestDeployment: null,
      domain: null,
      productionReady: false,
    });
    expect(await screen.findByRole('button', { name: 'Deploy' })).toBeInTheDocument();
  });

  it('hides the Deploy button for a role without deployment:create (viewer)', async () => {
    renderPanel('viewer', {
      generatedAt: '2026-01-01T00:00:00Z',
      leadId: 'lead-1',
      latestDeployment: null,
      domain: null,
      productionReady: false,
    });
    await screen.findByText('No deployment has been requested for this lead yet.');
    expect(screen.queryByRole('button', { name: 'Deploy' })).not.toBeInTheDocument();
  });

  it('surfaces the real backend error message via toast when Deploy fails validation, never simulating success', async () => {
    global.fetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'POST') {
        return jsonResponse(
          {
            error: {
              code: 'DEPLOYMENT_VALIDATION_FAILED',
              message: 'Publish readiness has not passed yet.',
            },
          },
          422,
        );
      }
      return jsonResponse({
        generatedAt: '2026-01-01T00:00:00Z',
        leadId: 'lead-1',
        latestDeployment: null,
        domain: null,
        productionReady: false,
      });
    }) as unknown as typeof fetch;

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <PermissionsProvider role="admin">
          <DeploymentStatusPanel leadId="lead-1" businessName="Joe's Diner" />
        </PermissionsProvider>
      </QueryClientProvider>,
    );

    await userEvent.click(await screen.findByRole('button', { name: 'Deploy' }));
    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith('Publish readiness has not passed yet.'),
    );
  });
});
