import type { TeamRole } from '@riznexia/shared-types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CurrentUserProvider } from '@/src/lib/current-user-context';
import { PermissionsProvider } from '@/src/lib/permissions-context';
import { LeadDetailPage } from './lead-detail-page';

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => 'test-token' }),
}));

const { push } = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const LEAD = {
  id: 'lead-1',
  businessId: 'business-1',
  businessName: 'Joe’s Diner',
  category: 'restaurant',
  city: 'Karachi',
  address: '123 Main St',
  websiteStatus: 'none',
  pipelineStage: 'qualified',
  assignedTo: null,
  tags: ['vip'],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const NOTES = {
  items: [
    {
      id: 'note-1',
      leadId: 'lead-1',
      authorId: null,
      body: 'Called them.',
      createdAt: '2026-01-02T00:00:00.000Z',
    },
  ],
  nextCursor: null,
};
const ACTIVITY = {
  items: [
    {
      id: 'activity-1',
      leadId: 'lead-1',
      actorId: null,
      type: 'created',
      detail: null,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ],
  nextCursor: null,
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function renderAs(role: TeamRole) {
  global.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/notes')) return jsonResponse(NOTES);
    if (url.includes('/activity')) return jsonResponse(ACTIVITY);
    if (url.includes('/leads/lead-1')) return jsonResponse(LEAD);
    return new Response('Not Found', { status: 404 });
  }) as unknown as typeof fetch;

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <CurrentUserProvider
        currentUser={{ id: 'member-1', name: 'Jane Rep', email: 'jane@riznexia.com', role }}
      >
        <PermissionsProvider role={role}>
          <LeadDetailPage leadId="lead-1" />
        </PermissionsProvider>
      </CurrentUserProvider>
    </QueryClientProvider>,
  );
}

// Lead Details (F4): displays only the fields GET /leads/:id actually
// returns, and renders the two founder-approved "not available"
// placeholders for Contact/Google Places Information rather than
// inventing data no backend endpoint provides.
describe('LeadDetailPage', () => {
  it('renders Business Information, Status/Tags/Assigned User, and honest placeholders for the two unavailable sections', async () => {
    renderAs('admin');

    expect(await screen.findByRole('heading', { name: 'Joe’s Diner' })).toBeInTheDocument();
    expect(screen.getByText('restaurant')).toBeInTheDocument();
    expect(screen.getByText('123 Main St')).toBeInTheDocument();
    expect(screen.getByText('Qualified')).toBeInTheDocument();
    expect(screen.getByText('vip')).toBeInTheDocument();
    expect(screen.getByText('Unassigned')).toBeInTheDocument();

    const placeholders = screen.getAllByText('Not available — not returned by the current API.');
    expect(placeholders).toHaveLength(2);
    expect(screen.getByText('Contact Information')).toBeInTheDocument();
    expect(screen.getByText('Google Places Information')).toBeInTheDocument();
  });

  it('shows Edit and Delete for admin (holds leads:write and leads:delete)', async () => {
    renderAs('admin');
    await screen.findByRole('heading', { name: 'Joe’s Diner' });

    expect(screen.getByRole('link', { name: /Edit/ })).toHaveAttribute(
      'href',
      '/leads/lead-1/edit',
    );
    expect(screen.getByRole('button', { name: /Delete/ })).toBeInTheDocument();
  });

  it('hides Edit and Delete for viewer (holds neither leads:write nor leads:delete)', async () => {
    renderAs('viewer');
    await screen.findByRole('heading', { name: 'Joe’s Diner' });

    expect(screen.queryByRole('link', { name: /Edit/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Delete/ })).not.toBeInTheDocument();
  });

  it('deletes the lead and navigates back to the list on confirm', async () => {
    renderAs('admin');
    await screen.findByRole('heading', { name: 'Joe’s Diner' });

    await userEvent.click(screen.getByRole('button', { name: /Delete/ }));
    const dialog = await screen.findByRole('alertdialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    expect(push).toHaveBeenCalledWith('/leads');
  });

  it('renders existing notes and hides the add-note form for a role without leads:write', async () => {
    renderAs('viewer');
    await screen.findByRole('heading', { name: 'Joe’s Diner' });

    expect(await screen.findByText('Called them.')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('Add a note…')).not.toBeInTheDocument();
  });

  it('shows the add-note form for a role with leads:write', async () => {
    renderAs('admin');
    await screen.findByRole('heading', { name: 'Joe’s Diner' });

    expect(screen.getByPlaceholderText('Add a note…')).toBeInTheDocument();
  });

  it('renders the activity timeline read-only, with the backend-provided label', async () => {
    renderAs('admin');
    await screen.findByRole('heading', { name: 'Joe’s Diner' });

    expect(await screen.findByText('Lead created')).toBeInTheDocument();
  });
});
