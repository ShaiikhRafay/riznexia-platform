import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ContentViewer } from './content-viewer';

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => 'test-token' }),
}));

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

const CONTENT_MANIFEST = {
  id: 'content-1',
  businessId: 'business-1',
  businessAnalysisId: 'analysis-1',
  themeConfigurationId: 'theme-1',
  layoutConfigurationId: 'layout-1',
  componentManifestId: 'manifest-1',
  configVersion: 1,
  contentEngineVersion: 'v1.0',
  componentContent: [
    {
      componentId: 'hero-1',
      fields: [
        {
          slotName: 'headline',
          kind: 'text',
          value: { value: "Joe's Diner", source: 'business.businessName' },
        },
        {
          slotName: 'ctaLink',
          kind: 'link',
          value: { value: { label: 'Call Now', url: 'tel:555-1234' }, source: 'business.phone' },
        },
        {
          slotName: 'photo',
          kind: 'image',
          value: { value: { photoReference: 'ref-abc-123' }, source: 'business.photos[0]' },
        },
      ],
    },
  ],
  unresolvedBindings: [
    {
      componentId: 'hero-1',
      slotName: 'testimonial',
      required: false,
      reason: 'no-source-available',
    },
  ],
  seoMetadata: {
    keywords: { value: ['diner near me'], source: 'brandBrief.seoKeywords' },
    localSeoSuggestions: { value: [], source: 'brandBrief.localSeoSuggestions' },
    metaTitle: { value: "Joe's Diner | Karachi", source: 'business.businessName' },
    metaDescription: null,
  },
  structuredData: [
    {
      type: 'LocalBusiness',
      data: { name: { value: "Joe's Diner", source: 'business.businessName' } },
    },
  ],
  createdAt: '2026-01-01T00:00:00.000Z',
};

function renderViewer(response: unknown) {
  global.fetch = vi.fn(async () => jsonResponse(response)) as unknown as typeof fetch;
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ContentViewer leadId="lead-1" />
    </QueryClientProvider>,
  );
}

// Content Viewer (F8): "Display the bound content exactly as returned...
// Never regenerate content. Never rewrite content." Text and CTA content
// are shown together (the backend doesn't separately flag which bindings
// are "CTA"), images are references only, every value carries its real
// source.
describe('ContentViewer', () => {
  it('renders bound content (text and CTA together, not artificially split) with source information', async () => {
    renderViewer(CONTENT_MANIFEST);

    const table = await screen.findByRole('table');
    expect(within(table).getByText("Joe's Diner")).toBeInTheDocument();
    expect(within(table).getByText('business.businessName')).toBeInTheDocument();
    expect(within(table).getByText('Call Now → tel:555-1234')).toBeInTheDocument();
  });

  it('shows image references only — the opaque token, never an <img>', async () => {
    renderViewer(CONTENT_MANIFEST);
    await screen.findByRole('table');

    expect(screen.getByText('ref-abc-123')).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('renders SEO content and structured data', async () => {
    renderViewer(CONTENT_MANIFEST);
    await screen.findByRole('table');

    expect(screen.getByText("Joe's Diner | Karachi")).toBeInTheDocument();
    expect(screen.getByText('diner near me')).toBeInTheDocument();
    expect(screen.getByText('LocalBusiness (1 field)')).toBeInTheDocument();
  });

  it('shows unresolved bindings explicitly, never fabricating a value for them', async () => {
    renderViewer(CONTENT_MANIFEST);
    await screen.findByRole('table');

    expect(screen.getByText('hero-1 · testimonial')).toBeInTheDocument();
    expect(screen.getByText('no-source-available')).toBeInTheDocument();
  });

  it('shows a plain message when no content has been bound yet', async () => {
    renderViewer(null);
    expect(
      await screen.findByText('No content has been bound for this lead yet.'),
    ).toBeInTheDocument();
  });
});
