import type { TeamRole } from '@riznexia/shared-types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PermissionsProvider } from '@/src/lib/permissions-context';
import { GeneratedWebsiteOverview } from './generated-website-overview';

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => 'test-token' }),
}));

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

const THEME_CONFIG = {
  id: 'theme-1',
  businessId: 'business-1',
  businessAnalysisId: 'analysis-1',
  configVersion: 3,
  themeId: 'restaurant',
  themeName: 'Bistro',
  themeVersion: '1.0.0',
  themeHash: 'abc123',
  selectedAt: '2026-01-01T00:00:00.000Z',
  selectedByEngineVersion: 'v1.0',
  compatibilityScore: 87,
  industry: 'Food & Beverage',
  layoutStyle: 'Modern grid',
  colorPalette: {
    primary: '#FF0000',
    secondary: '#00FF00',
    accent: '#0000FF',
    background: '#FFFFFF',
    text: '#000000',
  },
  typography: { heading: 'Poppins', body: 'Inter', accent: 'Caveat' },
  componentSet: [],
  navigationStyle: 'top-bar',
  heroStyle: 'full-bleed-image',
  ctaStyle: 'solid-button',
  cardStyle: 'elevated-shadow',
  footerStyle: 'multi-column',
  animationLevel: 'subtle',
  imageStyle: 'photography-realistic',
  sectionOrder: [],
  accessibilityProfile: {
    contrastLevel: 'AA',
    minTouchTargetPx: 44,
    reducedMotionSupport: true,
    altTextRequired: true,
  },
  mobilePreferences: { navigationPattern: 'hamburger', stackedLayout: true, tapTargetSizePx: 44 },
  sectionComponentMap: {},
  rankedThemes: [],
  aiRecommendationProvider: null,
  aiRecommendationModel: null,
  aiRecommendationPromptTokens: null,
  aiRecommendationCompletionTokens: null,
  aiRecommendationTotalTokens: null,
  aiRecommendationCostUsd: null,
  aiRecommendationExecutionTimeMs: null,
  createdAt: '2026-01-01T00:00:00.000Z',
};

const BUSINESS_ANALYSIS = {
  id: 'analysis-1',
  businessId: 'business-1',
  analysisVersion: 2,
  promptName: 'brand-brief-v1',
  promptVersion: '1.0.0',
  aiProvider: 'claude',
  aiModel: 'claude-sonnet-5',
  status: 'completed',
  brandBrief: null,
  confidenceScore: null,
  validationErrors: null,
  executionTimeMs: null,
  completedAt: '2026-01-01T00:00:00.000Z',
  promptTokens: null,
  completionTokens: null,
  totalTokens: null,
  estimatedCost: null,
  createdAt: '2026-01-01T00:00:00.000Z',
};

const GENERATED_WEBSITE = {
  id: 'website-1',
  businessId: 'business-1',
  businessAnalysisId: 'analysis-1',
  themeConfigurationId: 'theme-1',
  layoutConfigurationId: 'layout-1',
  componentManifestId: 'manifest-1',
  contentManifestId: 'content-1',
  configVersion: 1,
  assemblyEngineVersion: 'v1.0',
  files: [
    { path: 'app/page.tsx', content: '// page' },
    { path: 'app/layout.tsx', content: '// layout' },
  ],
  createdAt: '2026-01-01T00:00:00.000Z',
};

function renderAs(
  role: TeamRole,
  handlers: { website?: unknown; theme?: unknown; business?: unknown },
) {
  global.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/theme')) return jsonResponse(handlers.theme ?? null);
    if (url.includes('/business')) return jsonResponse(handlers.business ?? null);
    return jsonResponse(handlers.website ?? null);
  }) as unknown as typeof fetch;

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <PermissionsProvider role={role}>
        <GeneratedWebsiteOverview leadId="lead-1" />
      </PermissionsProvider>
    </QueryClientProvider>,
  );
}

// Generated Website Overview (F8): Website Version, Generator Version,
// Created Date, Generated Files Summary, Theme Used, Business Analysis
// Version, Theme Configuration Version — "only display fields returned
// by the backend, never invent data." The last three are resolved via
// F6's/F7's own reused GET hooks, since GeneratedWebsite's own response
// carries only raw foreign-key ids, never denormalized names/versions.
describe('GeneratedWebsiteOverview', () => {
  it('renders website metadata, files summary, and cross-pipeline passthrough fields', async () => {
    renderAs('admin', {
      website: GENERATED_WEBSITE,
      theme: THEME_CONFIG,
      business: BUSINESS_ANALYSIS,
    });

    expect(await screen.findByText('app/page.tsx')).toBeInTheDocument();
    expect(screen.getByText('app/layout.tsx')).toBeInTheDocument();
    // "File Count" (2) and "Business Analysis Version" (2) both render the
    // literal text "2" — scope to each field's own row to disambiguate.
    expect(screen.getByText('File Count').nextElementSibling).toHaveTextContent('2');
    expect(screen.getByText('Business Analysis Version').nextElementSibling).toHaveTextContent('2');
    expect(screen.getByText('v1.0')).toBeInTheDocument();
    expect(screen.getByText('Bistro')).toBeInTheDocument();
    expect(screen.getByText('Theme Configuration Version').nextElementSibling).toHaveTextContent(
      '3',
    );
  });

  it('offers to generate a website when none exists yet, gated on website:assemble', async () => {
    renderAs('admin', {});
    expect(
      await screen.findByText('No website has been generated for this lead yet.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Generate Website' })).toBeInTheDocument();
  });

  it('hides the generate action for a role without website:assemble', async () => {
    renderAs('viewer', {});
    await screen.findByText('No website has been generated for this lead yet.');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('links to Layout/Components/Content viewers once a website exists', async () => {
    renderAs('admin', { website: GENERATED_WEBSITE });
    await screen.findByText('app/page.tsx');

    expect(screen.getByRole('link', { name: 'Layout' })).toHaveAttribute(
      'href',
      '/website-generator/lead-1/layout',
    );
    expect(screen.getByRole('link', { name: 'Components' })).toHaveAttribute(
      'href',
      '/website-generator/lead-1/components',
    );
    expect(screen.getByRole('link', { name: 'Content' })).toHaveAttribute(
      'href',
      '/website-generator/lead-1/content',
    );
  });
});
