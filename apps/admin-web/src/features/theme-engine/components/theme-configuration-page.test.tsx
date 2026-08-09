import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ThemeConfigurationPage } from './theme-configuration-page';

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
    {
      rank: 2,
      themeId: 'corporate',
      themeName: 'Corporate',
      themeVersion: '1.0.0',
      themeHash: 'zzz',
      compatibilityScore: 55,
    },
  ],
  aiRecommendationProvider: 'claude',
  aiRecommendationModel: 'claude-sonnet-5',
  aiRecommendationPromptTokens: 50,
  aiRecommendationCompletionTokens: 20,
  aiRecommendationTotalTokens: 70,
  aiRecommendationCostUsd: 0.005,
  aiRecommendationExecutionTimeMs: 1200,
  createdAt: '2026-01-01T00:00:00.000Z',
};

function renderPage(response: unknown) {
  global.fetch = vi.fn(async () => jsonResponse(response)) as unknown as typeof fetch;
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ThemeConfigurationPage leadId="lead-1" />
    </QueryClientProvider>,
  );
}

// Theme Configuration (F7): read-only, no editing, every section built
// from real fields. "Compatibility validation results" (no such field
// exists) is honestly labeled "Other Themes Considered" using the real
// `rankedThemes` array, not presented as validation output it isn't.
describe('ThemeConfigurationPage', () => {
  it('renders metadata, selected components, configuration summary, accessibility/mobile, and ranked alternatives', async () => {
    renderPage(THEME_CONFIG);

    expect(await screen.findByText('restaurant')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    // "hero" appears twice by design (Component Set and Section Order are
    // two real, separate fields that happen to share a value here).
    expect(screen.getAllByText('hero')).toHaveLength(2);
    expect(screen.getByText('top-bar')).toBeInTheDocument();
    expect(screen.getByText('AA')).toBeInTheDocument();
    expect(screen.getByText('Other Themes Considered')).toBeInTheDocument();
    expect(screen.getByText('#1 Bistro (1.0.0)')).toBeInTheDocument();
    expect(screen.getByText('#2 Corporate (1.0.0)')).toBeInTheDocument();
    expect(screen.queryByText(/validation results/i)).not.toBeInTheDocument();
  });

  it('shows the AI Recommendation section only when the backend actually returned one', async () => {
    renderPage(THEME_CONFIG);
    await screen.findByText('Other Themes Considered');
    expect(screen.getByText('AI Recommendation')).toBeInTheDocument();
    expect(screen.getByText('claude-sonnet-5')).toBeInTheDocument();
  });

  it('hides the AI Recommendation section when it was never made (null fields)', async () => {
    renderPage({ ...THEME_CONFIG, aiRecommendationProvider: null, aiRecommendationModel: null });
    await screen.findByText('Other Themes Considered');
    expect(screen.queryByText('AI Recommendation')).not.toBeInTheDocument();
  });

  it('shows a plain message when no theme has been selected yet', async () => {
    renderPage(null);
    expect(
      await screen.findByText('No theme has been selected for this lead yet.'),
    ).toBeInTheDocument();
  });

  it('has no editing affordance anywhere on the page', async () => {
    renderPage(THEME_CONFIG);
    await screen.findByText('Other Themes Considered');
    expect(screen.queryByRole('button', { name: /save|edit|update/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });
});
