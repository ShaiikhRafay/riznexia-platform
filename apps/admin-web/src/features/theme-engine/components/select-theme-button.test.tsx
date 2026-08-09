import type { TeamRole } from '@riznexia/shared-types';
import { Toaster } from '@riznexia/ui';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PermissionsProvider } from '@/src/lib/permissions-context';
import { SelectThemeButton } from './select-theme-button';

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => 'test-token' }),
}));

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

function renderButton(role: TeamRole, hasExistingTheme = false) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <PermissionsProvider role={role}>
        <SelectThemeButton leadId="lead-1" hasExistingTheme={hasExistingTheme} />
        <Toaster />
      </PermissionsProvider>
    </QueryClientProvider>,
  );
}

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
      themeHash: 'abc123',
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

// Run/Re-run Theme Selection (F7): one mutation, one button whose label
// changes — the backend never distinguishes "run" from "re-run" itself
// (DECISIONS.md).
describe('SelectThemeButton', () => {
  it('labels itself "Run Theme Selection" when none exists yet', () => {
    renderButton('admin', false);
    expect(screen.getByRole('button', { name: 'Run Theme Selection' })).toBeInTheDocument();
  });

  it('labels itself "Re-run Theme Selection" when one already exists', () => {
    renderButton('admin', true);
    expect(screen.getByRole('button', { name: 'Re-run Theme Selection' })).toBeInTheDocument();
  });

  it('is hidden entirely for a role without theme:select (developer)', () => {
    renderButton('developer', false);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('is hidden entirely for viewer', () => {
    renderButton('viewer', false);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows a success toast naming the selected theme', async () => {
    global.fetch = vi.fn(async () => jsonResponse(THEME_CONFIG)) as unknown as typeof fetch;
    renderButton('admin', false);

    await userEvent.click(screen.getByRole('button', { name: 'Run Theme Selection' }));

    expect(await screen.findByText('Theme selected: Bistro')).toBeInTheDocument();
  });

  it('shows the backend error message verbatim on failure', async () => {
    global.fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            error: { code: 'BUSINESS_ANALYSIS_NOT_FOUND', message: 'Run business analysis first' },
          }),
          {
            status: 404,
            headers: { 'content-type': 'application/json' },
          },
        ),
    ) as unknown as typeof fetch;
    renderButton('admin', false);

    await userEvent.click(screen.getByRole('button', { name: 'Run Theme Selection' }));

    expect(await screen.findByText('Run business analysis first')).toBeInTheDocument();
  });
});
