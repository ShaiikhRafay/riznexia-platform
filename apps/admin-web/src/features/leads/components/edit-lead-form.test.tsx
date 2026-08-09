import type { Lead } from '@riznexia/shared-types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EditLeadForm } from './edit-lead-form';

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

const BASE_LEAD: Lead = {
  id: 'lead-1',
  businessId: 'business-1',
  businessName: 'Joe’s Diner',
  category: 'restaurant',
  city: 'Karachi',
  address: '123 Main St',
  websiteStatus: 'none',
  pipelineStage: 'new',
  assignedTo: '22222222-2222-2222-2222-222222222222',
  tags: ['vip'],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

function renderForm(lead: Lead = BASE_LEAD) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <EditLeadForm lead={lead} />
    </QueryClientProvider>,
  );
}

// Edit Lead: `PATCH /leads/:id`'s explicit-null-vs-omitted distinction —
// this form always sends `assignedTo` explicitly (a UUID or `null`), so
// clearing the field must send `null`, never omit the key.
describe('EditLeadForm', () => {
  it('pre-fills the stage, assigned user, and tags from the given lead', () => {
    renderForm();

    expect(screen.getByLabelText('Stage')).toHaveValue('new');
    expect(screen.getByLabelText('Assigned User ID (optional)')).toHaveValue(BASE_LEAD.assignedTo);
    expect(screen.getByText('vip')).toBeInTheDocument();
  });

  it('submits the new stage, and sends assignedTo: null when the field is cleared', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ ...BASE_LEAD, pipelineStage: 'qualified', assignedTo: null }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;
    renderForm();

    await userEvent.selectOptions(screen.getByLabelText('Stage'), 'qualified');
    await userEvent.clear(screen.getByLabelText('Assigned User ID (optional)'));
    await userEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    await screen.findByRole('button', { name: 'Save Changes' });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/leads/lead-1'),
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ pipelineStage: 'qualified', assignedTo: null, tags: ['vip'] }),
      }),
    );
    expect(push).toHaveBeenCalledWith('/leads/lead-1');
  });

  it('Cancel navigates back to the lead without submitting', async () => {
    global.fetch = vi.fn() as unknown as typeof fetch;
    renderForm();

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(global.fetch).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith('/leads/lead-1');
  });
});
