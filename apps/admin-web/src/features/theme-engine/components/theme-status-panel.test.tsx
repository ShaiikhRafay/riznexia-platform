import type { TeamRole } from '@riznexia/shared-types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PermissionsProvider } from '@/src/lib/permissions-context';
import { ThemeStatusPanel } from './theme-status-panel';

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => 'test-token' }),
}));

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

function renderPanel(role: TeamRole, handlers: { business?: unknown; theme?: unknown }) {
  global.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes('/theme')) {
      return jsonResponse(handlers.theme ?? null);
    }
    return jsonResponse(handlers.business ?? null);
  }) as unknown as typeof fetch;

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <PermissionsProvider role={role}>
        <ThemeStatusPanel leadId="lead-1" businessName="Joe's Diner" />
      </PermissionsProvider>
    </QueryClientProvider>,
  );
}

const COMPLETED_ANALYSIS = {
  id: 'analysis-1',
  businessId: 'business-1',
  analysisVersion: 1,
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

const THEME_CONFIG = {
  id: 'config-1',
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

// Theme Selection Dashboard (F7): "Display current theme status", "Run/
// Re-run Theme Selection", "Display compatibility score", "Display
// selected theme", "Display engine version", "Display theme version".
// Also proves the real backend precondition (a completed business
// analysis must exist first) is surfaced proactively, not left to a raw
// 404 from clicking Run blind.
describe('ThemeStatusPanel', () => {
  it('links to Business Analysis when no completed analysis exists yet', async () => {
    renderPanel('admin', { business: null });

    expect(
      await screen.findByText(/Theme selection needs a completed business analysis first/),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Run Business Analysis' })).toHaveAttribute(
      'href',
      '/business-analysis?leadId=lead-1',
    );
  });

  it('shows "no theme selected" once a completed analysis exists but no theme has been chosen', async () => {
    renderPanel('admin', { business: COMPLETED_ANALYSIS, theme: null });

    expect(
      await screen.findByText('No theme has been selected for this lead yet.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Run Theme Selection' })).toBeInTheDocument();
  });

  it('shows the selected theme, compatibility score, theme version, and engine version once one exists', async () => {
    renderPanel('admin', { business: COMPLETED_ANALYSIS, theme: THEME_CONFIG });

    expect(await screen.findByText('Bistro')).toBeInTheDocument();
    expect(screen.getByText('87/100')).toBeInTheDocument();
    expect(screen.getByText('1.0.0')).toBeInTheDocument();
    expect(screen.getByText('v1.0')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View full details' })).toHaveAttribute(
      'href',
      '/theme-engine/lead-1',
    );
    expect(screen.getByRole('link', { name: 'View configuration' })).toHaveAttribute(
      'href',
      '/theme-engine/lead-1/configuration',
    );
  });
});
