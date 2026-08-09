import type { TeamRole } from '@riznexia/shared-types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PermissionsProvider } from '@/src/lib/permissions-context';
import { SystemInformationPage } from './system-information-page';

vi.mock('next/navigation', () => ({
  usePathname: () => '/settings/system',
}));

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function renderPage(role: TeamRole, mockFetch: typeof fetch) {
  global.fetch = mockFetch;
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <PermissionsProvider role={role}>
        <SystemInformationPage />
      </PermissionsProvider>
    </QueryClientProvider>,
  );
}

describe('SystemInformationPage', () => {
  it('shows Reachable and the real server timestamp when /health responds', async () => {
    const mockFetch = vi.fn(async () =>
      jsonResponse({ status: 'ok', timestamp: '2026-08-07T12:00:00.000Z' }),
    ) as unknown as typeof fetch;
    renderPage('admin', mockFetch);
    expect(await screen.findByText('Reachable')).toBeInTheDocument();
    expect(screen.getByText('2026-08-07T12:00:00.000Z')).toBeInTheDocument();
  });

  it('shows Unreachable when /health fails, never a fabricated status', async () => {
    const mockFetch = vi.fn(async () =>
      jsonResponse({ error: { code: 'INTERNAL', message: 'down' } }, 500),
    ) as unknown as typeof fetch;
    renderPage('admin', mockFetch);
    expect(await screen.findByText('Unreachable')).toBeInTheDocument();
  });

  it('marks fields with no backend endpoint as Not available', () => {
    const mockFetch = vi.fn(async () =>
      jsonResponse({ status: 'ok', timestamp: '2026-08-07T12:00:00.000Z' }),
    ) as unknown as typeof fetch;
    renderPage('admin', mockFetch);
    expect(screen.getByText('Application Version')).toBeInTheDocument();
    expect(screen.getByText('Git Commit')).toBeInTheDocument();
    expect(screen.getAllByText('Not available').length).toBe(7);
  });

  it('blocks the whole page for a role without team:manage', () => {
    const mockFetch = vi.fn(async () =>
      jsonResponse({ status: 'ok', timestamp: '2026-08-07T12:00:00.000Z' }),
    ) as unknown as typeof fetch;
    renderPage('viewer', mockFetch);
    expect(screen.getByText(/don.t have permission to view settings/)).toBeInTheDocument();
  });
});
