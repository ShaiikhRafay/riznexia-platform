import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useLayoutConfiguration } from './use-layout-configuration';

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

// Representative of all four M8.1-M8.4 GET hooks: no polling, deliberately
// — every generator in this pipeline is synchronous and deterministic
// (verified against the backend's own service files), so a single fetch
// is always sufficient.
describe('useLayoutConfiguration', () => {
  it('resolves to null when no layout has been generated yet', async () => {
    global.fetch = vi.fn(async () => jsonResponse(null)) as unknown as typeof fetch;

    const { result } = renderHook(() => useLayoutConfiguration('lead-1'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
  });

  it('resolves to the full LayoutConfiguration in a single fetch, with no polling', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
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
          items: ['Home'],
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
        grid: [
          { sectionId: 'hero', columns: { mobile: 1, tablet: 2, desktop: 3 }, gap: 'standard' },
        ],
        responsiveRules: {
          breakpoints: { mobile: 0, tablet: 768, desktop: 1024, wide: 1440 },
          stackedLayout: true,
          tapTargetSizePx: 44,
          perSection: {},
        },
        ctaPlacements: [{ ctaText: 'Book Now', zone: 'hero', style: 'solid-button' }],
        componentPlaceholders: [{ componentId: 'hero-1', sectionId: 'hero', order: 0 }],
        createdAt: '2026-01-01T00:00:00.000Z',
      }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const { result } = renderHook(() => useLayoutConfiguration('lead-1'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.layoutEngineVersion).toBe('v1.0');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
