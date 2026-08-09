import type { TeamRole } from '@riznexia/shared-types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PermissionsProvider } from '@/src/lib/permissions-context';
import { ResponsivePreview } from './responsive-preview';

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => 'test-token' }),
}));

const { replace, searchParams } = vi.hoisted(() => ({
  replace: vi.fn(),
  searchParams: new URLSearchParams(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => searchParams,
}));

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const PREVIEW = {
  id: 'preview-1',
  businessId: 'business-1',
  generatedWebsiteId: 'website-1',
  businessName: "Joe's Diner",
  themeName: 'Bistro',
  themeId: 'restaurant',
  devicePresets: [
    { mode: 'desktop', widthPx: 1440 },
    { mode: 'tablet', widthPx: 768 },
    { mode: 'mobile', widthPx: 375 },
  ],
  files: [
    { path: 'app/page.tsx', sizeBytes: 1024 },
    { path: 'app/layout.tsx', sizeBytes: 512 },
  ],
  previewVersion: 1,
  generatedWebsiteVersion: 1,
  validationVersion: 'v1.0',
  generatedByModuleVersion: 'v1.0',
  createdAt: '2026-01-01T00:00:00.000Z',
};

function renderPreview(role: TeamRole, response: unknown, status = 200) {
  const fetchMock = vi.fn(async () => jsonResponse(response, status));
  global.fetch = fetchMock as unknown as typeof fetch;
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <PermissionsProvider role={role}>
        <ResponsivePreview leadId="lead-1" />
      </PermissionsProvider>
    </QueryClientProvider>,
  );
  return fetchMock;
}

describe('ResponsivePreview', () => {
  beforeEach(() => {
    replace.mockClear();
    for (const key of Array.from(searchParams.keys())) {
      searchParams.delete(key);
    }
  });

  it('shows a blocked message, not a generic error, when no generated website exists yet', async () => {
    renderPreview(
      'admin',
      { error: { code: 'GENERATED_WEBSITE_NOT_FOUND', message: 'not found' } },
      404,
    );
    expect(await screen.findByText(/run Website Generator first/)).toBeInTheDocument();
  });

  it('hides the preview for a role without website:preview', async () => {
    renderPreview('viewer', PREVIEW);
    expect(
      await screen.findByText(/don.t have permission to open the website preview/),
    ).toBeInTheDocument();
    expect(screen.queryByText('1440px viewport')).not.toBeInTheDocument();
  });

  it('renders the desktop file manifest by default, honestly labeled as structural, not a live render', async () => {
    renderPreview('admin', PREVIEW);
    expect(await screen.findByText('1440px viewport')).toBeInTheDocument();
    expect(screen.getByText(/Structural summary, not a rendered screenshot/)).toBeInTheDocument();
    expect(screen.getByText('app/page.tsx')).toBeInTheDocument();
  });

  it('switching device tabs changes only the displayed viewport, without a second fetch', async () => {
    const fetchMock = renderPreview('admin', PREVIEW);
    await screen.findByText('1440px viewport');
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await userEvent.click(screen.getByRole('tab', { name: 'Mobile' }));

    expect(await screen.findByText('375px viewport')).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
