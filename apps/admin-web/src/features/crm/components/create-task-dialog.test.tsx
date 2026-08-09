import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CreateTaskDialog } from './create-task-dialog';

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => 'test-token' }),
}));

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

function renderDialog(leadId?: string) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <CreateTaskDialog leadId={leadId} />
    </QueryClientProvider>,
  );
}

// Create Task (F10): `POST /leads/:id/tasks` requires `leadId` in the URL,
// not the body. When opened without a fixed `leadId` (the global Tasks
// page), the dialog requires picking a lead via `LeadSelect` before
// submission is possible at all.
describe('CreateTaskDialog', () => {
  it('blocks submission and shows a validation error for an empty title, with a fixed leadId', async () => {
    global.fetch = vi.fn(async () =>
      jsonResponse({ items: [], nextCursor: null }),
    ) as unknown as typeof fetch;
    renderDialog('lead-1');

    await userEvent.click(screen.getByRole('button', { name: 'New Task' }));
    await userEvent.click(screen.getByRole('button', { name: 'Create Task' }));

    expect(await screen.findByText(/Title is required/i)).toBeInTheDocument();
  });

  it('disables the Create Task button until a lead is selected, when no fixed leadId is given', async () => {
    global.fetch = vi.fn(async () =>
      jsonResponse({ items: [], nextCursor: null }),
    ) as unknown as typeof fetch;
    renderDialog(undefined);

    await userEvent.click(screen.getByRole('button', { name: 'New Task' }));

    expect(screen.getByRole('button', { name: 'Create Task' })).toBeDisabled();
    expect(screen.getByLabelText('Search leads')).toBeInTheDocument();
  });

  it('submits to POST /leads/:id/tasks with the fixed leadId', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        id: 'task-1',
        leadId: 'lead-1',
        title: 'Call back',
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
      }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;
    renderDialog('lead-1');

    await userEvent.click(screen.getByRole('button', { name: 'New Task' }));
    await userEvent.type(screen.getByLabelText('Title'), 'Call back');
    await userEvent.type(screen.getByLabelText('Due Date'), '2026-02-01T09:00');
    await userEvent.click(screen.getByRole('button', { name: 'Create Task' }));

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/leads/lead-1/tasks'),
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
