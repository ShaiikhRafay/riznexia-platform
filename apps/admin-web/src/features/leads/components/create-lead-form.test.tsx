import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CreateLeadForm } from './create-lead-form';

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => 'test-token' }),
}));

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function renderForm() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <CreateLeadForm />
    </QueryClientProvider>,
  );
}

const VALID_BUSINESS_ID = '11111111-1111-1111-1111-111111111111';

// Create Lead (founder-approved resolution): `POST /leads` requires an
// existing Business ID and there is no business search endpoint, so this
// form takes a raw UUID. These tests prove the RHF+Zod wiring against the
// real `createLeadSchema` shape, not a hand-invented one.
describe('CreateLeadForm', () => {
  it('blocks submission and shows a validation error for an empty Business ID', async () => {
    global.fetch = vi.fn() as unknown as typeof fetch;
    renderForm();

    await userEvent.click(screen.getByRole('button', { name: 'Create Lead' }));

    expect(await screen.findByText(/valid Business ID/i)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('rejects a non-UUID Business ID', async () => {
    global.fetch = vi.fn() as unknown as typeof fetch;
    renderForm();

    await userEvent.type(screen.getByLabelText('Business ID'), 'not-a-uuid');
    await userEvent.click(screen.getByRole('button', { name: 'Create Lead' }));

    expect(await screen.findByText(/valid Business ID/i)).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('submits exactly businessId/pipelineStage/tags on success, and navigates to the new lead', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse(
        {
          id: 'lead-1',
          businessId: VALID_BUSINESS_ID,
          businessName: 'Joe’s Diner',
          category: 'restaurant',
          city: 'Karachi',
          address: '123 Main St',
          websiteStatus: 'none',
          pipelineStage: 'new',
          assignedTo: null,
          tags: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        201,
      ),
    );
    global.fetch = fetchMock as unknown as typeof fetch;
    renderForm();

    await userEvent.type(screen.getByLabelText('Business ID'), VALID_BUSINESS_ID);
    await userEvent.click(screen.getByRole('button', { name: 'Create Lead' }));

    await screen.findByRole('button', { name: 'Create Lead' });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/leads'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ businessId: VALID_BUSINESS_ID, pipelineStage: 'new', tags: [] }),
      }),
    );
    expect(push).toHaveBeenCalledWith('/leads/lead-1');
  });
});
