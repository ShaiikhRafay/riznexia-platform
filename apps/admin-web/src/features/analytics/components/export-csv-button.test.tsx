import type { TeamRole } from '@riznexia/shared-types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PermissionsProvider } from '@/src/lib/permissions-context';
import { ExportCsvButton } from './export-csv-button';

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => 'test-token' }),
}));

const { toastSuccess, toastError } = vi.hoisted(() => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));
vi.mock('@riznexia/ui', async () => {
  const actual = await vi.importActual<typeof import('@riznexia/ui')>('@riznexia/ui');
  return { ...actual, toast: { ...actual.toast, success: toastSuccess, error: toastError } };
});

function renderButton(role: TeamRole) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <PermissionsProvider role={role}>
        <ExportCsvButton type="lead_funnel" period={{ period: 'monthly' }} />
      </PermissionsProvider>
    </QueryClientProvider>,
  );
}

describe('ExportCsvButton', () => {
  it('shows the button for a role with analytics:export (admin)', () => {
    renderButton('admin');
    expect(screen.getByRole('button', { name: 'Export CSV' })).toBeInTheDocument();
  });

  it('hides the button for a role without analytics:export (developer)', () => {
    renderButton('developer');
    expect(screen.queryByRole('button', { name: 'Export CSV' })).not.toBeInTheDocument();
  });

  it('only ever requests format=csv — the only implemented format — and triggers a real download', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      expect(String(input)).toContain('format=csv');
      expect(String(input)).not.toContain('format=pdf');
      expect(String(input)).not.toContain('format=excel');
      return new Response('a,b\n1,2', { status: 200, headers: { 'content-type': 'text/csv' } });
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    global.URL.createObjectURL = vi.fn(() => 'blob:mock');
    global.URL.revokeObjectURL = vi.fn();

    renderButton('admin');
    await userEvent.click(screen.getByRole('button', { name: 'Export CSV' }));

    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith('Export downloaded'));
    expect(fetchMock).toHaveBeenCalled();
  });
});
