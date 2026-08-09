import type { TeamRole } from '@riznexia/shared-types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PermissionsProvider } from '@/src/lib/permissions-context';
import { ThemeDefaultsPage } from './theme-defaults-page';

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => 'test-token' }),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/settings/theme-defaults',
}));

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

const ENVELOPE = {
  reportType: 'theme_usage',
  generatedAt: '2026-01-01T00:00:00.000Z',
  period: 'monthly',
  filters: { fromDate: null, toDate: null },
  data: { byTheme: [{ themeId: 'restaurant', themeName: 'Restaurant', count: 7 }] },
};

function renderPage(role: TeamRole) {
  global.fetch = vi.fn(async () => jsonResponse(ENVELOPE)) as unknown as typeof fetch;
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <PermissionsProvider role={role}>
        <ThemeDefaultsPage />
      </PermissionsProvider>
    </QueryClientProvider>,
  );
}

describe('ThemeDefaultsPage', () => {
  it('shows real theme usage counts and links to Theme Engine instead of a fake default', async () => {
    renderPage('admin');
    expect(await screen.findByText('Restaurant')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /View Theme Engine/ })).toHaveAttribute(
      'href',
      '/theme-engine',
    );
  });

  it('blocks the whole page for a role without team:manage', async () => {
    renderPage('sales_executive');
    expect(await screen.findByText(/don.t have permission to view settings/)).toBeInTheDocument();
  });
});
