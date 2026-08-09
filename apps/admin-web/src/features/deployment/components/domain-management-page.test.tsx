import type { TeamRole } from '@riznexia/shared-types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PermissionsProvider } from '@/src/lib/permissions-context';
import { DomainManagementPage } from './domain-management-page';

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

const DOMAIN = {
  id: 'domain-1',
  businessId: 'business-1',
  hostname: 'example.com',
  type: 'custom',
  provider: 'vercel',
  verificationStatus: 'pending',
  verificationRecord: null,
  sslStatus: 'pending',
  currentDeploymentId: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function renderPage(role: TeamRole, domains: unknown[]) {
  global.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/domains')) {
      return jsonResponse(domains);
    }
    return jsonResponse(LEAD);
  }) as unknown as typeof fetch;

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <PermissionsProvider role={role}>
        <DomainManagementPage leadId="lead-1" />
      </PermissionsProvider>
    </QueryClientProvider>,
  );
}

describe('DomainManagementPage', () => {
  it('lists Domain Name, Verification Status, SSL Status, and Connected Deployment', async () => {
    renderPage('admin', [DOMAIN]);
    expect(await screen.findByText('example.com')).toBeInTheDocument();
    // Verification Status and SSL Status both default to "pending" on a
    // freshly registered domain — two separate badges, same label.
    expect(screen.getAllByText('Pending')).toHaveLength(2);
    expect(screen.getByText('None')).toBeInTheDocument();
  });

  it('links Connected Deployment to Deployment Details when currentDeploymentId is set', async () => {
    renderPage('admin', [{ ...DOMAIN, currentDeploymentId: 'deployment-1' }]);
    expect(await screen.findByRole('link', { name: 'View Deployment' })).toHaveAttribute(
      'href',
      '/deployment/lead-1/deployments/deployment-1',
    );
  });

  it('shows Register Domain for a role with deployment:manage', async () => {
    renderPage('admin', []);
    expect(await screen.findByRole('button', { name: 'Register Domain' })).toBeInTheDocument();
  });

  it('hides Register Domain and per-row Verify for a role without deployment:manage (sales_executive)', async () => {
    renderPage('sales_executive', [DOMAIN]);
    await screen.findByText('example.com');
    expect(screen.queryByRole('button', { name: 'Register Domain' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Verify' })).not.toBeInTheDocument();
  });

  it('disables Verify (shown as "Verified") once a domain is already verified', async () => {
    renderPage('admin', [{ ...DOMAIN, verificationStatus: 'verified' }]);
    expect(await screen.findByRole('button', { name: 'Verified' })).toBeDisabled();
  });

  it('registers a domain through the dialog and shows the real result', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/domains') && init?.method === 'POST') {
        return jsonResponse({ ...DOMAIN, hostname: 'new-domain.com' }, 201);
      }
      if (url.includes('/domains')) {
        return jsonResponse([]);
      }
      return jsonResponse(LEAD);
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <PermissionsProvider role="admin">
          <DomainManagementPage leadId="lead-1" />
        </PermissionsProvider>
      </QueryClientProvider>,
    );

    await userEvent.click(await screen.findByRole('button', { name: 'Register Domain' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText('Hostname'), 'new-domain.com');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Register Domain' }));

    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith('Domain registered'));
  });
});
