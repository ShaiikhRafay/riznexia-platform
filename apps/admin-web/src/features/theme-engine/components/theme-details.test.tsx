import type { TeamRole } from '@riznexia/shared-types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PermissionsProvider } from '@/src/lib/permissions-context';
import { ThemeDetails } from './theme-details';

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => 'test-token' }),
}));

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const BRAND_BRIEF = {
  businessSummary: 'A cozy neighborhood diner.',
  industry: 'Food & Beverage',
  targetAudience: ['Families', 'Young professionals'],
  brandPersonality: ['Warm', 'Reliable'],
  toneOfVoice: 'Friendly and casual',
  primaryServices: ['Breakfast'],
  secondaryServices: [],
  uniqueSellingPoints: ['24/7 service'],
  colorPalette: {
    primary: '#FF0000',
    secondary: '#00FF00',
    accent: '#0000FF',
    background: '#FFFFFF',
    text: '#000000',
  },
  typography: { heading: 'Poppins', body: 'Inter', accent: 'Caveat' },
  layoutStyle: 'Modern grid',
  websiteSections: ['Hero', 'Menu'],
  seoKeywords: ['diner near me'],
  localSeoSuggestions: [],
  ctaRecommendations: ['Order Now'],
  trustSignals: [],
  socialProofSuggestions: [],
  imageRecommendations: [],
  contentRecommendations: ['Highlight daily specials'],
};

const COMPLETED_ANALYSIS = {
  id: 'analysis-1',
  businessId: 'business-1',
  analysisVersion: 1,
  promptName: 'brand-brief-v1',
  promptVersion: '1.0.0',
  aiProvider: 'claude',
  aiModel: 'claude-sonnet-5',
  status: 'completed',
  brandBrief: BRAND_BRIEF,
  confidenceScore: 0.9,
  validationErrors: null,
  executionTimeMs: 4000,
  completedAt: '2026-01-01T00:00:00.000Z',
  promptTokens: 100,
  completionTokens: 200,
  totalTokens: 300,
  estimatedCost: 0.02,
  createdAt: '2026-01-01T00:00:00.000Z',
};

const THEME_CONFIG = {
  id: 'config-1',
  businessId: 'business-1',
  businessAnalysisId: 'analysis-1',
  configVersion: 2,
  themeId: 'restaurant',
  themeName: 'Bistro',
  themeVersion: '1.0.0',
  themeHash: 'abcdef1234567890',
  selectedAt: '2026-01-01T00:00:05.000Z',
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
  componentSet: ['hero', 'menu'],
  navigationStyle: 'top-bar',
  heroStyle: 'full-bleed-image',
  ctaStyle: 'solid-button',
  cardStyle: 'elevated-shadow',
  footerStyle: 'multi-column',
  animationLevel: 'subtle',
  imageStyle: 'photography-realistic',
  sectionOrder: ['hero', 'menu'],
  accessibilityProfile: {
    contrastLevel: 'AA',
    minTouchTargetPx: 44,
    reducedMotionSupport: true,
    altTextRequired: true,
  },
  mobilePreferences: { navigationPattern: 'hamburger', stackedLayout: true, tapTargetSizePx: 44 },
  sectionComponentMap: { hero: ['hero'], menu: ['menu'] },
  rankedThemes: [
    {
      rank: 1,
      themeId: 'restaurant',
      themeName: 'Bistro',
      themeVersion: '1.0.0',
      themeHash: 'abcdef1234567890',
      compatibilityScore: 87,
    },
  ],
  aiRecommendationProvider: null,
  aiRecommendationModel: null,
  aiRecommendationPromptTokens: null,
  aiRecommendationCompletionTokens: null,
  aiRecommendationTotalTokens: null,
  aiRecommendationCostUsd: null,
  aiRecommendationExecutionTimeMs: null,
  createdAt: '2026-01-01T00:00:00.000Z',
};

function renderAs(
  role: TeamRole,
  handlers: { business?: unknown; theme?: unknown },
  themeStatus = 200,
) {
  global.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/theme')) {
      return jsonResponse(handlers.theme ?? null, themeStatus);
    }
    return jsonResponse(handlers.business ?? null);
  }) as unknown as typeof fetch;

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <PermissionsProvider role={role}>
        <ThemeDetails leadId="lead-1" />
      </PermissionsProvider>
    </QueryClientProvider>,
  );
}

// Theme Details (F7): displays every field GET /leads/:id/theme actually
// returns, plus the brand-passthrough fields fetched separately from M6's
// GET /leads/:id/business (reused F6 hook) — never a "Brand Style" field,
// since it isn't real anywhere in either schema.
describe('ThemeDetails', () => {
  it('renders theme identity, design, and every founder-requested brand-passthrough field', async () => {
    renderAs('admin', { business: COMPLETED_ANALYSIS, theme: THEME_CONFIG });

    expect(await screen.findByRole('heading', { name: 'Bistro' })).toBeInTheDocument();
    expect(screen.getByText('1.0.0')).toBeInTheDocument();
    expect(screen.getByText('abcdef1234567890')).toBeInTheDocument();
    expect(screen.getByText('87/100')).toBeInTheDocument();
    expect(screen.getByText('v1.0')).toBeInTheDocument();
    expect(screen.getByText('Modern grid')).toBeInTheDocument();

    // The brand-passthrough fields come from a second, separate fetch
    // (useBusinessAnalysis, only mounted once the theme itself has
    // resolved) — awaited explicitly rather than assumed to have settled
    // in the same tick as the theme fetch above.
    expect(await screen.findByText('Warm')).toBeInTheDocument();
    expect(screen.getByText('Friendly and casual')).toBeInTheDocument();
    expect(screen.getByText('Families')).toBeInTheDocument();
    expect(screen.getByText('Hero')).toBeInTheDocument();
    expect(screen.getByText('Order Now')).toBeInTheDocument();
    expect(screen.getByText(/originate from the AI Business Analyzer/)).toBeInTheDocument();
  });

  it('never renders a "Brand Style" field — not a real field on either schema', async () => {
    renderAs('admin', { business: COMPLETED_ANALYSIS, theme: THEME_CONFIG });
    await screen.findByRole('heading', { name: 'Bistro' });

    expect(screen.queryByText(/brand style/i)).not.toBeInTheDocument();
  });

  it('offers to run a theme selection when none exists yet', async () => {
    renderAs('admin', { business: COMPLETED_ANALYSIS, theme: null });
    expect(
      await screen.findByText('No theme has been selected for this lead yet.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Run Theme Selection' })).toBeInTheDocument();
  });

  it('shows an inline ErrorState on a backend failure', async () => {
    renderAs(
      'admin',
      { theme: { error: { code: 'RESOURCE_NOT_FOUND', message: 'Lead not found' } } },
      404,
    );
    expect(await screen.findByText('Lead not found')).toBeInTheDocument();
  });
});
