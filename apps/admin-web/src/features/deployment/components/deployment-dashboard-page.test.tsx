import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PermissionsProvider } from '@/src/lib/permissions-context';
import { DeploymentDashboardPage } from './deployment-dashboard-page';

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => 'test-token' }),
}));

const { push, searchParams } = vi.hoisted(() => ({
  push: vi.fn(),
  searchParams: new URLSearchParams(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: push }),
  useSearchParams: () => searchParams,
}));

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

function renderDashboard() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <PermissionsProvider role="admin">
        <DeploymentDashboardPage />
      </PermissionsProvider>
    </QueryClientProvider>,
  );
}

describe('DeploymentDashboardPage', () => {
  beforeEach(() => {
    push.mockClear();
    for (const key of Array.from(searchParams.keys())) {
      searchParams.delete(key);
    }
  });

  it('shows no panel until a lead is selected', () => {
    global.fetch = vi.fn(async () =>
      jsonResponse({ items: [], nextCursor: null }),
    ) as unknown as typeof fetch;
    renderDashboard();

    expect(screen.queryByText('Current Deployment')).not.toBeInTheDocument();
  });

  it('pushes ?leadId=<id> to the URL when a lead is picked', async () => {
    global.fetch = vi.fn(async () =>
      jsonResponse({
        items: [{ id: 'lead-1', businessName: "Joe's Diner", city: 'Karachi' }],
        nextCursor: null,
      }),
    ) as unknown as typeof fetch;
    renderDashboard();

    await userEvent.type(screen.getByLabelText('Search leads'), 'Joe');
    await userEvent.click(await screen.findByText("Joe's Diner"));

    expect(push).toHaveBeenCalledWith('?leadId=lead-1');
  });

  it("renders the selected lead's status panel when ?leadId= is already in the URL (reload-safe)", async () => {
    searchParams.set('leadId', 'lead-1');
    global.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/deployment-status')) {
        return jsonResponse({
          generatedAt: '2026-01-01T00:00:00Z',
          leadId: 'lead-1',
          latestDeployment: null,
          domain: null,
          productionReady: false,
        });
      }
      return jsonResponse({
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
      });
    }) as unknown as typeof fetch;
    renderDashboard();

    expect(
      await screen.findByText('No deployment has been requested for this lead yet.'),
    ).toBeInTheDocument();
  });
});
