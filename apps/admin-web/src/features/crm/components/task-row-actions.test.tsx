import type { CrmTask, TeamRole } from '@riznexia/shared-types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PermissionsProvider } from '@/src/lib/permissions-context';
import { TaskRowActions } from './task-row-actions';

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => 'test-token' }),
}));

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

const BASE_TASK: CrmTask = {
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

function renderActions(role: TeamRole, task: CrmTask) {
  global.fetch = vi.fn(async () =>
    jsonResponse({ ...task, status: 'completed' }),
  ) as unknown as typeof fetch;
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <PermissionsProvider role={role}>
        <TaskRowActions task={task} leadId={task.leadId} />
      </PermissionsProvider>
    </QueryClientProvider>,
  );
}

// Complete/Cancel are both `PATCH /crm/tasks/:id` with just `{status}` —
// no dedicated action route exists. Hidden entirely for a role without
// `crm:manage`, and hidden once a task has already reached a terminal
// status, rather than shown-then-disabled.
describe('TaskRowActions', () => {
  it('hides Edit/Complete/Cancel for a role without crm:manage (developer)', () => {
    renderActions('developer', BASE_TASK);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows Complete and Cancel for a pending task when crm:manage is held', () => {
    renderActions('admin', BASE_TASK);
    expect(screen.getByRole('button', { name: /Complete/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Cancel/ })).toBeInTheDocument();
  });

  it('hides Complete once a task is already completed', () => {
    renderActions('admin', { ...BASE_TASK, status: 'completed' });
    expect(screen.queryByRole('button', { name: /Complete/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Cancel/ })).not.toBeInTheDocument();
  });

  it('calls PATCH /crm/tasks/:id with {status: "completed"} when Complete is clicked', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ ...BASE_TASK, status: 'completed' }));
    global.fetch = fetchMock as unknown as typeof fetch;
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <PermissionsProvider role="admin">
          <TaskRowActions task={BASE_TASK} leadId={BASE_TASK.leadId} />
        </PermissionsProvider>
      </QueryClientProvider>,
    );

    await userEvent.click(screen.getByRole('button', { name: /Complete/ }));

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/crm/tasks/task-1'),
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ status: 'completed' }) }),
    );
  });
});
