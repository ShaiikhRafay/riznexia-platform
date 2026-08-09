import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LayoutViewer } from './layout-viewer';

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => 'test-token' }),
}));

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const LAYOUT_CONFIG = {
  id: 'layout-1',
  businessId: 'business-1',
  businessAnalysisId: 'analysis-1',
  themeConfigurationId: 'theme-1',
  configVersion: 2,
  layoutEngineVersion: 'v1.0',
  pageStructure: [
    { sectionId: 'menu', order: 2, layoutType: 'grid' },
    { sectionId: 'hero', order: 1, layoutType: 'full-width' },
  ],
  navigation: {
    style: 'top-bar',
    position: 'top',
    sticky: true,
    items: ['Home', 'Menu'],
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
  grid: [{ sectionId: 'hero', columns: { mobile: 1, tablet: 2, desktop: 3 }, gap: 'standard' }],
  responsiveRules: {
    breakpoints: { mobile: 0, tablet: 768, desktop: 1024, wide: 1440 },
    stackedLayout: true,
    tapTargetSizePx: 44,
    perSection: {},
  },
  ctaPlacements: [{ ctaText: 'Book Now', zone: 'hero', style: 'solid-button' }],
  componentPlaceholders: [{ componentId: 'hero-1', sectionId: 'hero', order: 0 }],
  createdAt: '2026-01-01T00:00:00.000Z',
};

function renderViewer(response: unknown, status = 200) {
  global.fetch = vi.fn(async () => jsonResponse(response, status)) as unknown as typeof fetch;
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <LayoutViewer leadId="lead-1" />
    </QueryClientProvider>,
  );
}

// Layout Viewer (F8): "Display the generated layout exactly as returned...
// Read-only. Never modify layout." — no input/form/mutation anywhere.
describe('LayoutViewer', () => {
  it('renders sections in order, hierarchy, and layout metadata', async () => {
    renderViewer(LAYOUT_CONFIG);

    expect(await screen.findByText('v1.0')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    // Sections are re-sorted by `order` regardless of array order.
    const sectionsCard = screen.getByText('Sections & Order (Layout Structure)').closest('section');
    expect(sectionsCard).not.toBeNull();
    const sectionText = (sectionsCard as HTMLElement).textContent ?? '';
    expect(sectionText.indexOf('1. hero')).toBeLessThan(sectionText.indexOf('2. menu'));
    expect(screen.getByText('hero-1')).toBeInTheDocument();
    expect(screen.getByText('Book Now')).toBeInTheDocument();
  });

  it('has no editing affordance anywhere', async () => {
    renderViewer(LAYOUT_CONFIG);
    await screen.findByText('v1.0');
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows a plain message when no layout has been generated yet', async () => {
    renderViewer(null);
    expect(
      await screen.findByText('No layout has been generated for this lead yet.'),
    ).toBeInTheDocument();
  });

  it('shows an inline ErrorState on a backend failure', async () => {
    renderViewer({ error: { code: 'RESOURCE_NOT_FOUND', message: 'Lead not found' } }, 404);
    expect(await screen.findByText('Lead not found')).toBeInTheDocument();
  });
});
