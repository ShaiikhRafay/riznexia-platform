import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RefreshIntervalProvider } from '../refresh-interval';
import { DashboardToolbar } from './dashboard-toolbar';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

function renderToolbar() {
  const queryClient = new QueryClient();
  const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
  render(
    <QueryClientProvider client={queryClient}>
      <RefreshIntervalProvider>
        <DashboardToolbar />
      </RefreshIntervalProvider>
    </QueryClientProvider>,
  );
  return { invalidateSpy };
}

describe('DashboardToolbar', () => {
  it('renders the period and refresh-interval controls plus a manual refresh button', () => {
    renderToolbar();
    expect(screen.getByRole('button', { name: /monthly/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /manual/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Refresh now' })).toBeInTheDocument();
  });

  it('invalidates every dashboard query key when "Refresh now" is clicked', async () => {
    const { invalidateSpy } = renderToolbar();
    await userEvent.click(screen.getByRole('button', { name: 'Refresh now' }));

    const invalidatedKeys = invalidateSpy.mock.calls.map(
      (call) => (call[0] as { queryKey: string[] }).queryKey[0],
    );
    expect(invalidatedKeys).toEqual(
      expect.arrayContaining(['analytics-dashboard', 'crm-dashboard', 'crm-tasks']),
    );
  });
});
