import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PermissionsProvider } from '@/src/lib/permissions-context';
import { DeploymentHistoryPage } from './deployment-history-page';

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => 'test-token' }),
}));

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

const LEAD = {
  id: 'lead-1',
  businessId: 'business-1',
  businessName: "Joe's Diner",
  category: 'restaurant',
  city: 'Karachi',
  address: '123 Main St',
  websiteStatus: 'none',
  pipelineStage: 'new',
  assignedTo: null,
  tags: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

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
    commitHash: null,
    status: 'completed',
    healthStatus: 'healthy',
    liveUrl: 'https://joes-diner.vercel.app',
    errorMessage: null,
    deploymentHash: 'hash-1',
    deploymentEngineVersion: 'v1.0',
    rollbackFromDeploymentId: null,
    retryOfDeploymentId: 'deployment-0',
    buildStartedAt: '2026-01-01T00:00:00.000Z',
    buildCompletedAt: '2026-01-01T00:01:00.000Z',
    completedAt: '2026-01-01T00:01:00.000Z',
    executionDuration: 1500,
    createdById: 'member-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function renderPage(items: unknown[]) {
  global.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/deployments')) {
      return jsonResponse({ items, nextCursor: null });
    }
    return jsonResponse(LEAD);
  }) as unknown as typeof fetch;

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <PermissionsProvider role="admin">
        <DeploymentHistoryPage leadId="lead-1" />
      </PermissionsProvider>
    </QueryClientProvider>,
  );
}

describe('DeploymentHistoryPage', () => {
  it('lists Version, Provider, Environment, Status, Started/Finished Time, Duration, and derived Trigger Type', async () => {
    renderPage([makeDeployment()]);

    expect(await screen.findByText('v3')).toBeInTheDocument();
    expect(screen.getByText('Vercel')).toBeInTheDocument();
    expect(screen.getByText('production')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
    expect(screen.getByText('1.5s')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('labels a deployment with neither retryOfDeploymentId nor rollbackFromDeploymentId as Manual', async () => {
    renderPage([makeDeployment({ retryOfDeploymentId: null })]);
    expect(await screen.findByText('Manual')).toBeInTheDocument();
  });

  it('labels a deployment with rollbackFromDeploymentId set as Rollback', async () => {
    renderPage([
      makeDeployment({ retryOfDeploymentId: null, rollbackFromDeploymentId: 'deployment-0' }),
    ]);
    expect(await screen.findByText('Rollback')).toBeInTheDocument();
  });

  it('shows an empty state when no deployments exist', async () => {
    renderPage([]);
    expect(await screen.findByText('No deployments found')).toBeInTheDocument();
  });
});
