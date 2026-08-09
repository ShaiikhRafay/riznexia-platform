import type { TeamRole } from '@riznexia/shared-types';
import { Toaster } from '@riznexia/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PermissionsProvider } from '@/src/lib/permissions-context';
import { WebsitePipelinePanel } from './website-pipeline-panel';

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
  configVersion: 1,
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
  componentSet: ['hero'],
  navigationStyle: 'top-bar',
  heroStyle: 'full-bleed-image',
  ctaStyle: 'solid-button',
  cardStyle: 'elevated-shadow',
  footerStyle: 'multi-column',
  animationLevel: 'subtle',
  imageStyle: 'photography-realistic',
  sectionOrder: ['hero'],
  accessibilityProfile: {
    contrastLevel: 'AA',
    minTouchTargetPx: 44,
    reducedMotionSupport: true,
    altTextRequired: true,
  },
  mobilePreferences: { navigationPattern: 'hamburger', stackedLayout: true, tapTargetSizePx: 44 },
  sectionComponentMap: { hero: ['hero'] },
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

const LAYOUT_CONFIG = {
  id: 'layout-1',
  businessId: 'business-1',
  businessAnalysisId: 'analysis-1',
  themeConfigurationId: 'theme-1',
  configVersion: 1,
  layoutEngineVersion: 'v1.0',
  pageStructure: [{ sectionId: 'hero', order: 1, layoutType: 'full-width' }],
  navigation: {
    style: 'top-bar',
    position: 'top',
    sticky: true,
    items: [],
    mobileBehavior: 'hamburger',
  },
  hero: {
    style: 'full-bleed-image',
    mediaPosition: 'background',
    contentAlignment: 'center',
    ctaSlots: 1,
  },
  footer: {
    style: 'simple-centered',
    columns: 1,
    includesNewsletter: false,
    includesSocialLinks: true,
  },
  sidebar: null,
  grid: [],
  responsiveRules: {
    breakpoints: { mobile: 0, tablet: 768, desktop: 1024, wide: 1440 },
    stackedLayout: true,
    tapTargetSizePx: 44,
    perSection: {},
  },
  ctaPlacements: [],
  componentPlaceholders: [],
  createdAt: '2026-01-01T00:00:00.000Z',
};

function renderAs(
  role: TeamRole,
  handlers: {
    theme?: unknown;
    layout?: unknown;
    components?: unknown;
    content?: unknown;
    website?: unknown;
  },
) {
  global.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/theme')) return jsonResponse(handlers.theme ?? null);
    if (url.includes('/components')) return jsonResponse(handlers.components ?? null);
    if (url.includes('/content')) return jsonResponse(handlers.content ?? null);
    if (url.includes('/website')) return jsonResponse(handlers.website ?? null);
    if (url.includes('/layout')) return jsonResponse(handlers.layout ?? null);
    return jsonResponse(null);
  }) as unknown as typeof fetch;

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <PermissionsProvider role={role}>
        <WebsitePipelinePanel leadId="lead-1" businessName="Joe's Diner" />
        <Toaster />
      </PermissionsProvider>
    </QueryClientProvider>,
  );
}

// Website Generator Dashboard (founder-approved resolution): the backend
// has a hard Layout→Component→Content→Website dependency chain with no
// auto-orchestration — this proves the panel surfaces every real
// precondition rather than letting a user hit a blind 404.
describe('WebsitePipelinePanel', () => {
  it('links to Theme Engine when no theme has been selected yet', async () => {
    renderAs('admin', {});
    expect(
      await screen.findByText(/Website generation needs a selected theme first/),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Run Theme Selection' })).toHaveAttribute(
      'href',
      '/theme-engine?leadId=lead-1',
    );
  });

  it('offers Layout generation once a theme exists, and blocks the later stages with real reasons', async () => {
    renderAs('admin', { theme: THEME_CONFIG });

    expect(await screen.findByRole('button', { name: 'Generate Layout' })).toBeInTheDocument();
    expect(screen.getByText('Requires Layout first')).toBeInTheDocument();
    expect(screen.getByText('Requires Components first')).toBeInTheDocument();
    expect(screen.getByText('Requires Content first')).toBeInTheDocument();
  });

  it('generates Layout and reflects the new state (Generated, version shown)', async () => {
    let layoutGenerated = false;
    global.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('/theme')) return jsonResponse(THEME_CONFIG);
      if (url.includes('/layout') && init?.method === 'POST') {
        layoutGenerated = true;
        return jsonResponse(LAYOUT_CONFIG);
      }
      if (url.includes('/layout')) return jsonResponse(layoutGenerated ? LAYOUT_CONFIG : null);
      return jsonResponse(null);
    }) as unknown as typeof fetch;

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <PermissionsProvider role="admin">
          <WebsitePipelinePanel leadId="lead-1" businessName="Joe's Diner" />
          <Toaster />
        </PermissionsProvider>
      </QueryClientProvider>,
    );

    await userEvent.click(await screen.findByRole('button', { name: 'Generate Layout' }));

    expect(await screen.findByText('Layout generated')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Re-generate Layout' })).toBeInTheDocument();
  });

  it('hides every generate button for a role without any of the four generation permissions (developer)', async () => {
    renderAs('developer', { theme: THEME_CONFIG });
    await screen.findByText('Requires Layout first');

    expect(screen.queryAllByRole('button', { name: /Generate/ })).toHaveLength(0);
  });

  it('shows "Generated" and a View link for a stage once its resource exists', async () => {
    renderAs('admin', { theme: THEME_CONFIG, layout: LAYOUT_CONFIG });

    const layoutStage = (await screen.findByText('Layout')).closest('div')?.parentElement;
    expect(layoutStage).not.toBeNull();
    expect(within(layoutStage as HTMLElement).getByText('Generated')).toBeInTheDocument();
    expect(within(layoutStage as HTMLElement).getByRole('link', { name: 'View' })).toHaveAttribute(
      'href',
      '/website-generator/lead-1/layout',
    );
  });
});
