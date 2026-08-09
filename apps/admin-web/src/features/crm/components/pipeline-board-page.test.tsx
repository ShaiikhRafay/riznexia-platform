import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PermissionsProvider } from '@/src/lib/permissions-context';
import { PipelineBoardPage } from './pipeline-board-page';

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => 'test-token' }),
}));

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

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
  {
    id: 'stage-lost',
    key: 'lost',
    name: 'Lost',
    order: 2,
    isWon: false,
    isLost: true,
    color: null,
    archivedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

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

const LOST_REASONS = [
  {
    id: 'reason-1',
    key: 'too_expensive',
    label: 'Too expensive',
    order: 1,
    archivedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

function renderBoard() {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/crm/stages')) return jsonResponse(STAGES);
    if (url.includes('/crm/lost-reasons')) return jsonResponse(LOST_REASONS);
    if (url.includes('/crm')) return jsonResponse(LEAD_CRM);
    if (url.includes('/leads')) return jsonResponse({ items: [LEAD], nextCursor: null });
    return jsonResponse(null);
  });
  global.fetch = fetchMock as unknown as typeof fetch;
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <PermissionsProvider role="admin">
        <PipelineBoardPage />
      </PermissionsProvider>
    </QueryClientProvider>,
  );
  return fetchMock;
}

// Pipeline Board (F10, founder-approved bounded/paginated resolution):
// stage movement is real — the explicit stage-picker calls the one real
// `POST /leads/:id/crm/stage` endpoint, "never fake." Moving into a
// `isLost` stage always prompts for a lost reason first.
describe('PipelineBoardPage', () => {
  it('renders real stage columns from GET /crm/stages, with the loaded lead in its real stage', async () => {
    renderBoard();
    expect(await screen.findByRole('heading', { name: 'New' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Lost' })).toBeInTheDocument();
    expect(screen.getByText("Joe's Diner")).toBeInTheDocument();
  });

  it('prompts for a lost reason before moving a lead into an isLost stage, rather than moving it immediately', async () => {
    renderBoard();
    await screen.findByText("Joe's Diner");

    const select = screen.getByLabelText("Move Joe's Diner to stage");
    await userEvent.selectOptions(select, 'stage-lost');

    expect(await screen.findByText('Why was this lead lost?')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Move to Lost' })).toBeDisabled();
  });

  it('calls POST /leads/:id/crm/stage with the chosen lostReasonId once one is selected', async () => {
    const fetchMock = renderBoard();
    await screen.findByText("Joe's Diner");

    await userEvent.selectOptions(screen.getByLabelText("Move Joe's Diner to stage"), 'stage-lost');
    const dialog = await screen.findByRole('dialog');
    await userEvent.selectOptions(within(dialog).getByRole('combobox'), 'reason-1');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Move to Lost' }));

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/leads/lead-1/crm/stage'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ stageId: 'stage-lost', lostReasonId: 'reason-1' }),
      }),
    );
  });
});
