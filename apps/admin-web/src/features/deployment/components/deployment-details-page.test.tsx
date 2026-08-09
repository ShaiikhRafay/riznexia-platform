import type { TeamRole } from '@riznexia/shared-types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PermissionsProvider } from '@/src/lib/permissions-context';
import { DeploymentDetailsPage } from './deployment-details-page';

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

function makeDeployment(overrides: Record<string, unknown> = {}) {
  return {
    id: 'deployment-1',
    businessId: 'business-1',
    generatedWebsiteId: 'website-1',
    generatedWebsiteVersion: 1,
    deploymentVersion: 3,
    provider: 'vercel',
    providerVersion: 'v1.0',
    providerDeploymentId: 'dpl_1',
    environment: 'production',
    commitHash: 'abc123',
    status: 'completed',
    healthStatus: 'healthy',
    liveUrl: 'https://joes-diner.vercel.app',
    errorMessage: null,
    deploymentHash: 'hash-1',
    deploymentEngineVersion: 'v1.0',
    rollbackFromDeploymentId: null,
    retryOfDeploymentId: null,
    buildStartedAt: '2026-01-01T00:00:00.000Z',
    buildCompletedAt: '2026-01-01T00:01:00.000Z',
    completedAt: '2026-01-01T00:01:00.000Z',
    executionDuration: 60000,
    createdById: 'member-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function renderPage(role: TeamRole, deployment: unknown) {
  global.fetch = vi.fn(async () => jsonResponse(deployment)) as unknown as typeof fetch;
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <PermissionsProvider role={role}>
        <DeploymentDetailsPage leadId="lead-1" deploymentId="deployment-1" />
      </PermissionsProvider>
    </QueryClientProvider>,
  );
}

describe('DeploymentDetailsPage', () => {
  it('displays every WebsiteDeployment field grouped into Deployment/Build/Commit/Metadata cards', async () => {
    renderPage('admin', makeDeployment());

    expect(await screen.findByText('Deployment v3')).toBeInTheDocument();
    expect(screen.getByText('deployment-1')).toBeInTheDocument();
    expect(screen.getByText('Vercel')).toBeInTheDocument();
    expect(screen.getByText('abc123')).toBeInTheDocument();
    expect(screen.getByText('hash-1')).toBeInTheDocument();
    expect(screen.getByText('website-1')).toBeInTheDocument();
  });

  it('honestly states no deployment log text is returned by the backend', async () => {
    renderPage('admin', makeDeployment());
    expect(
      await screen.findByText('The backend does not return deployment log text for this resource.'),
    ).toBeInTheDocument();
  });

  it('shows Rollback Availability as Available for a completed+healthy deployment', async () => {
    renderPage('admin', makeDeployment({ status: 'completed', healthStatus: 'healthy' }));
    expect((await screen.findAllByText('Available')).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Roll Back to This Deployment' })).toBeEnabled();
  });

  it('shows Rollback Availability as Not Available and disables the button for a failed deployment', async () => {
    renderPage('admin', makeDeployment({ status: 'failed', healthStatus: 'unknown' }));
    expect(await screen.findByText('Not Available')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Roll Back to This Deployment' })).toBeDisabled();
  });

  it('shows a Retry button only for a failed deployment, gated on deployment:create', async () => {
    renderPage('admin', makeDeployment({ status: 'failed', healthStatus: 'unknown' }));
    expect(await screen.findByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('hides Retry for a completed deployment', async () => {
    renderPage('admin', makeDeployment({ status: 'completed', healthStatus: 'healthy' }));
    await screen.findByText('Deployment v3');
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
  });

  it('hides Roll Back entirely for a role without deployment:rollback (sales_executive)', async () => {
    renderPage('sales_executive', makeDeployment({ status: 'completed', healthStatus: 'healthy' }));
    await screen.findByText('Deployment v3');
    expect(
      screen.queryByRole('button', { name: 'Roll Back to This Deployment' }),
    ).not.toBeInTheDocument();
  });

  it('links Retry Of / Rollback From to their own Deployment Details pages when set', async () => {
    renderPage('admin', makeDeployment({ retryOfDeploymentId: 'deployment-0' }));
    expect(await screen.findByRole('link', { name: 'deployment-0' })).toHaveAttribute(
      'href',
      '/deployment/lead-1/deployments/deployment-0',
    );
  });

  it('surfaces the real backend error via toast when Retry is rejected', async () => {
    global.fetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'POST') {
        return jsonResponse(
          {
            error: {
              code: 'DEPLOYMENT_NOT_RETRYABLE',
              message: 'Only a failed deployment can be retried.',
            },
          },
          400,
        );
      }
      return jsonResponse(makeDeployment({ status: 'failed', healthStatus: 'unknown' }));
    }) as unknown as typeof fetch;

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <PermissionsProvider role="admin">
          <DeploymentDetailsPage leadId="lead-1" deploymentId="deployment-1" />
        </PermissionsProvider>
      </QueryClientProvider>,
    );

    await userEvent.click(await screen.findByRole('button', { name: 'Retry' }));
    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith('Only a failed deployment can be retried.'),
    );
  });
});
