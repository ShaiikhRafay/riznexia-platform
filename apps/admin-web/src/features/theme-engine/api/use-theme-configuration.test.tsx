import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useThemeConfiguration } from './use-theme-configuration';

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => 'test-token' }),
}));

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

// No polling here, deliberately — `ThemeConfiguration` has no status
// enum at all; `POST /leads/:id/theme` always returns a fully-formed,
// terminal row synchronously (verified against theme-selection.service.ts
// directly). This test proves the hook handles both the `null` (nothing
// selected yet) and populated cases via one plain fetch, with no
// `refetchInterval` behavior to prove.
describe('useThemeConfiguration', () => {
  it('resolves to null when no theme has been selected yet', async () => {
    global.fetch = vi.fn(async () => jsonResponse(null)) as unknown as typeof fetch;

    const { result } = renderHook(() => useThemeConfiguration('lead-1'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });

  it('resolves to the full ThemeConfiguration when one exists, in a single fetch', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
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
        mobilePreferences: {
          navigationPattern: 'hamburger',
          stackedLayout: true,
          tapTargetSizePx: 44,
        },
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
      }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const { result } = renderHook(() => useThemeConfiguration('lead-1'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.themeName).toBe('Bistro');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
