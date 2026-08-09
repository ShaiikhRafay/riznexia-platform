import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CurrentUserProvider } from '@/src/lib/current-user-context';
import { PermissionsProvider } from '@/src/lib/permissions-context';
import { TasksPage } from './tasks-page';

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => 'test-token' }),
}));

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

const CURRENT_USER = {
  id: 'user-1',
  name: 'Me',
  email: 'me@example.com',
  role: 'admin' as const,
};

const TASK = {
  id: 'task-1',
  leadId: 'lead-1',
  title: 'Follow up call',
  description: null,
  dueDate: '2026-02-01T00:00:00.000Z',
  priority: 'medium',
  status: 'pending',
  assignedToId: null,
  reminderAt: null,
  estimatedDurationMinutes: null,
  actualDurationMinutes: null,
  completedById: null,
  completedAt: null,
  createdById: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function renderPage(role: 'admin' | 'developer' = 'admin') {
  global.fetch = vi.fn(async () =>
    jsonResponse({ items: [TASK], nextCursor: null }),
  ) as unknown as typeof fetch;
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <PermissionsProvider role={role}>
        <CurrentUserProvider currentUser={CURRENT_USER}>
          <TasksPage />
        </CurrentUserProvider>
      </PermissionsProvider>
    </QueryClientProvider>,
  );
}

// Tasks (F10): global `GET /crm/tasks` rendered via the shared DataTable;
// "New Task" is gated on `crm:manage`, the entire page content is gated
// on `crm:view` (a `developer` holds neither).
describe('TasksPage', () => {
  it('renders the task list for a role with crm:view', async () => {
    renderPage('admin');
    expect(await screen.findByText('Follow up call')).toBeInTheDocument();
  });

  it('shows New Task for a role with crm:manage', async () => {
    renderPage('admin');
    expect(await screen.findByRole('button', { name: 'New Task' })).toBeInTheDocument();
  });

  it('hides all CRM content for a role without crm:view (developer)', () => {
    renderPage('developer');
    expect(screen.getByText(/don.t have permission to view the Sales CRM/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'New Task' })).not.toBeInTheDocument();
  });
});
