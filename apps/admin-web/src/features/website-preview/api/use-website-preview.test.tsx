import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/src/lib/api-client';
import { useWebsitePreview } from './use-website-preview';

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => 'test-token' }),
}));

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

// Unlike every prior GET hook in this app, this one is never `.nullable()`
// — the backend has no "not generated yet" success response for this
// resource, only a real 404 (GENERATED_WEBSITE_NOT_FOUND) when no
// GeneratedWebsite exists, or a fully-formed WebsitePreview every time
// otherwise (computed-and-cached inline, never pending).
describe('useWebsitePreview', () => {
  it('resolves to the full WebsitePreview in a single fetch, with no polling', async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
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
        files: [{ path: 'app/page.tsx', sizeBytes: 1024 }],
        previewVersion: 1,
        generatedWebsiteVersion: 1,
        validationVersion: 'v1.0',
        generatedByModuleVersion: 'v1.0',
        createdAt: '2026-01-01T00:00:00.000Z',
      }),
    );
    global.fetch = fetchMock as unknown as typeof fetch;

    const { result } = renderHook(() => useWebsitePreview('lead-1'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.businessName).toBe("Joe's Diner");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('surfaces a GENERATED_WEBSITE_NOT_FOUND 404 as an ApiError, not a null success', async () => {
    global.fetch = vi.fn(async () =>
      jsonResponse(
        {
          error: {
            code: 'GENERATED_WEBSITE_NOT_FOUND',
            message: 'No generated website exists yet for this lead',
          },
        },
        404,
      ),
    ) as unknown as typeof fetch;

    const { result } = renderHook(() => useWebsitePreview('lead-1'), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
    expect((result.current.error as ApiError).code).toBe('GENERATED_WEBSITE_NOT_FOUND');
  });
});
