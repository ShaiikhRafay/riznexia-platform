import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PermissionsProvider } from '@/src/lib/permissions-context';
import { LeadCrmDetailsPage } from './lead-crm-details-page';

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
  address: '1 Main St',
  websiteStatus: 'none',
  pipelineStage: 'new',
  assignedTo: null,
  tags: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};
const LEAD_CRM = {
  id: 'crm-1',
  leadId: 'lead-1',
  stageId: 'stage-new',
  dealValueUsd: 1200,
  lostReasonId: null,
  ownerId: null,
  nextFollowUpAt: null,
  lastActivityAt: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};
const STAGES = [
  {
    id: 'stage-new',
    key: 'new',
    name: 'New',
    order: 1,
    isWon: false,
    isLost: false,
    color: null,
    archivedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];
const WEBSITE_STATUS = {
  leadId: 'lead-1',
  stage: 'not_started',
  hasAnalysis: false,
  hasTheme: false,
  hasLayout: false,
  hasComponents: false,
  hasContent: false,
  hasGeneratedWebsite: false,
  generatedWebsiteVersion: null,
  hasPreview: false,
  publishReadinessScore: null,
};

function renderPage() {
  global.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/crm/stages')) return jsonResponse(STAGES);
    if (url.includes('/crm/lost-reasons')) return jsonResponse([]);
    if (url.includes('/website-status')) return jsonResponse(WEBSITE_STATUS);
    if (url.includes('/tasks')) return jsonResponse({ items: [], nextCursor: null });
    if (url.includes('/activity')) return jsonResponse({ items: [], nextCursor: null });
    if (url.includes('/proposals')) return jsonResponse({ items: [], nextCursor: null });
    if (url.includes('/crm')) return jsonResponse(LEAD_CRM);
    return jsonResponse(LEAD);
  }) as unknown as typeof fetch;

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <PermissionsProvider role="admin">
        <LeadCrmDetailsPage leadId="lead-1" />
      </PermissionsProvider>
    </QueryClientProvider>,
  );
}

// Lead CRM Details (F10): composes Lead Information/CRM Status/Assigned
// User/Tasks/Activities/Proposals/Website Status/Timeline, each backed by
// a real fetch (own or reused from F4/F8).
describe('LeadCrmDetailsPage', () => {
  it('renders every section with real backend data', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: "Joe's Diner" })).toBeInTheDocument();
    expect(screen.getByText('Category: restaurant')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'CRM Status' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Tasks' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Activities' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Proposals' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Website Status' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Timeline' })).toBeInTheDocument();
    expect(
      await screen.findByText(
        (_, element) =>
          element?.tagName.toLowerCase() === 'p' && element.textContent === 'Deal Value: $1,200',
      ),
    ).toBeInTheDocument();
  });
});
