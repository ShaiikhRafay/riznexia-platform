import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PermissionsProvider } from '@/src/lib/permissions-context';
import { ActivitiesPage } from './activities-page';

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => 'test-token' }),
}));

const { push, searchParams } = vi.hoisted(() => ({
  push: vi.fn(),
  searchParams: new URLSearchParams(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => searchParams,
}));

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

const ACTIVITIES = [
  {
    id: 'act-1',
    leadId: 'lead-1',
    actorId: null,
    type: 'call',
    detail: null,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'act-2',
    leadId: 'lead-1',
    actorId: null,
    type: 'email',
    detail: null,
    createdAt: '2026-01-02T00:00:00.000Z',
  },
  {
    id: 'act-3',
    leadId: 'lead-1',
    actorId: null,
    type: 'stage_changed',
    detail: { from: 'new', to: 'qualified' },
    createdAt: '2026-01-03T00:00:00.000Z',
  },
];
const NOTES = [
  {
    id: 'note-1',
    leadId: 'lead-1',
    authorId: null,
    body: 'Called twice, no answer',
    createdAt: '2026-01-04T00:00:00.000Z',
  },
];

function renderPage() {
  searchParams.set('leadId', 'lead-1');
  global.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/notes')) {
      return jsonResponse({ items: NOTES, nextCursor: null });
    }
    if (url.includes('/activity')) {
      return jsonResponse({ items: ACTIVITIES, nextCursor: null });
    }
    return jsonResponse({ items: [], nextCursor: null });
  }) as unknown as typeof fetch;

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <PermissionsProvider role="admin">
        <ActivitiesPage />
      </PermissionsProvider>
    </QueryClientProvider>,
  );
}

// Activities (F10): "Never merge or infer activity types." Notes come
// from a genuinely separate backend entity (`LeadNote`, not a
// `LeadActivityType`) and must never appear inside an activity category
// tab, nor should any activity type leak into the Notes tab.
describe('ActivitiesPage', () => {
  it('shows the Calls tab by default, filtered to only call-type activities', async () => {
    renderPage();
    expect(await screen.findByText('Call logged')).toBeInTheDocument();
    expect(screen.queryByText('Email logged')).not.toBeInTheDocument();
    expect(screen.queryByText('Called twice, no answer')).not.toBeInTheDocument();
  });

  it('switches to the Notes tab and shows only real LeadNote entries, never merged with activities', async () => {
    renderPage();
    await screen.findByText('Call logged');

    await userEvent.click(screen.getByRole('tab', { name: 'Notes' }));

    expect(await screen.findByText('Called twice, no answer')).toBeInTheDocument();
    expect(screen.queryByText('Call logged')).not.toBeInTheDocument();
    expect(screen.queryByText('Stage changed')).not.toBeInTheDocument();
  });

  it('does not show stage_changed (a system event, not one of the 5 requested categories) in any activity tab', async () => {
    renderPage();
    await screen.findByText('Call logged');
    await userEvent.click(screen.getByRole('tab', { name: 'Emails' }));
    expect(screen.queryByText('Stage changed')).not.toBeInTheDocument();
  });
});
