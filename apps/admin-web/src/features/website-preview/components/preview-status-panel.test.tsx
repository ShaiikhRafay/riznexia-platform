import type { TeamRole } from '@riznexia/shared-types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PermissionsProvider } from '@/src/lib/permissions-context';
import { PreviewStatusPanel } from './preview-status-panel';

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => 'test-token' }),
}));

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const WEBSITE = {
  id: 'website-1',
  businessId: 'business-1',
  businessAnalysisId: 'analysis-1',
  themeConfigurationId: 'theme-1',
  layoutConfigurationId: 'layout-1',
  componentManifestId: 'manifest-1',
  contentManifestId: 'content-1',
  configVersion: 1,
  assemblyEngineVersion: 'v1.0',
  files: [{ path: 'app/page.tsx', content: '// page' }],
  createdAt: '2026-01-01T00:00:00.000Z',
};

const PREVIEW = {
  id: 'preview-1',
  businessId: 'business-1',
  generatedWebsiteId: 'website-1',
  businessName: "Joe's Diner",
  themeName: 'Bistro',
  themeId: 'restaurant',
  devicePresets: [{ mode: 'desktop', widthPx: 1440 }],
  files: [{ path: 'app/page.tsx', sizeBytes: 1024 }],
  previewVersion: 1,
  generatedWebsiteVersion: 1,
  validationVersion: 'v1.0',
  generatedByModuleVersion: 'v1.0',
  createdAt: '2026-01-01T00:00:00.000Z',
};

function renderPanel(
  role: TeamRole,
  handlers: { website?: unknown; preview?: unknown; previewStatus?: number },
) {
  global.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/preview')) {
      return jsonResponse(handlers.preview ?? null, handlers.previewStatus ?? 200);
    }
    return jsonResponse(handlers.website ?? null);
  }) as unknown as typeof fetch;

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <PermissionsProvider role={role}>
        <PreviewStatusPanel leadId="lead-1" businessName="Joe's Diner" />
      </PermissionsProvider>
    </QueryClientProvider>,
  );
}

describe('PreviewStatusPanel', () => {
  it('shows a blocked message with a link to Website Generator when no website has been generated yet', async () => {
    renderPanel('admin', {});
    expect(await screen.findByText('Website Not Generated Yet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to Website Generator' })).toHaveAttribute(
      'href',
      '/website-generator/lead-1',
    );
  });

  it('hides preview details for a role without website:preview, even when a website exists', async () => {
    renderPanel('viewer', { website: WEBSITE });
    expect(
      await screen.findByText(/don.t have permission to open the website preview/),
    ).toBeInTheDocument();
    expect(screen.queryByText('Preview Available')).not.toBeInTheDocument();
  });

  it('shows latest preview information and links to the three report pages when available', async () => {
    renderPanel('admin', { website: WEBSITE, preview: PREVIEW });

    expect(await screen.findByText('Preview Available')).toBeInTheDocument();
    expect(screen.getByText("Joe's Diner")).toBeInTheDocument();
    expect(screen.getByText('Bistro')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Responsive Preview' })).toHaveAttribute(
      'href',
      '/website-preview/lead-1/preview',
    );
    expect(screen.getByRole('link', { name: 'Validation Report' })).toHaveAttribute(
      'href',
      '/website-preview/lead-1/validation',
    );
    expect(screen.getByRole('link', { name: 'Publish Readiness' })).toHaveAttribute(
      'href',
      '/website-preview/lead-1/readiness',
    );
  });

  it('shows a blocked state, not a generic error, on a defensive GENERATED_WEBSITE_NOT_FOUND from the preview endpoint itself', async () => {
    renderPanel('admin', {
      website: WEBSITE,
      preview: {
        error: { code: 'GENERATED_WEBSITE_NOT_FOUND', message: 'No generated website exists yet' },
      },
      previewStatus: 404,
    });

    expect(await screen.findByText('Website Not Generated Yet')).toBeInTheDocument();
  });
});
