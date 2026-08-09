import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ComponentViewer } from './component-viewer';

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => 'test-token' }),
}));

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

const COMPONENT_MANIFEST = {
  id: 'manifest-1',
  businessId: 'business-1',
  businessAnalysisId: 'analysis-1',
  themeConfigurationId: 'theme-1',
  layoutConfigurationId: 'layout-1',
  configVersion: 1,
  componentEngineVersion: 'v1.0',
  themeTokens: {
    primary: '#FF0000',
    secondary: '#00FF00',
    accent: '#0000FF',
    background: '#FFFFFF',
    text: '#000000',
    heading: 'Poppins',
    body: 'Inter',
    radius: { small: '4px', medium: '8px', large: '16px', full: '9999px' },
    spacing: { xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '32px' },
    shadow: 'subtle',
    button: 'solid-button',
    card: 'elevated-shadow',
    animation: 'subtle',
  },
  components: [
    {
      componentId: 'hero-1',
      componentType: 'hero',
      parentComponentId: null,
      childComponentIds: [],
      requiredContent: [{ slotName: 'headline', kind: 'text' }],
      optionalContent: [],
      themeTokens: { background: 'token.primary' },
      responsiveRules: { rule: 'stack' },
      accessibility: {
        role: 'banner',
        altTextRequired: true,
        minTouchTargetPx: 44,
        contrastLevel: 'AA',
      },
      visibility: { mode: 'always' },
      placeholders: [
        { slotName: 'headline', kind: 'text', required: true, placeholderLabel: '[Headline]' },
      ],
    },
  ],
  createdAt: '2026-01-01T00:00:00.000Z',
};

function renderViewer(response: unknown) {
  global.fetch = vi.fn(async () => jsonResponse(response)) as unknown as typeof fetch;
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <ComponentViewer leadId="lead-1" />
    </QueryClientProvider>,
  );
}

// Component Viewer (F8): "Display every generated component... Read-only.
// Do not render editable components." "Component Name" is `componentId`
// — there is no separate name field on ComponentDefinition.
describe('ComponentViewer', () => {
  it('lists every component in the DataTable summary and renders full detail cards', async () => {
    renderViewer(COMPONENT_MANIFEST);

    const table = await screen.findByRole('table');
    expect(within(table).getByText('hero-1')).toBeInTheDocument();
    expect(within(table).getByText('hero')).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'hero-1' })).toBeInTheDocument();
    // "background: token.primary" renders as separate text nodes (JSX
    // interpolation), so match on the specific <li>'s full text — a
    // generic textContent match would also hit its ancestor <ul>/<div>,
    // which contain identical text since this is the item's only child.
    expect(
      screen.getByText(
        (_, element) =>
          element?.tagName.toLowerCase() === 'li' &&
          element.textContent === 'background: token.primary',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('[Headline] — headline')).toBeInTheDocument();
  });

  it("has no save/edit/update affordance anywhere — only the DataTable's own search box, a viewing aid, not a data editor", async () => {
    renderViewer(COMPONENT_MANIFEST);
    await screen.findByRole('table');
    expect(screen.queryByRole('button', { name: /save|edit|update/i })).not.toBeInTheDocument();
  });

  it('shows a plain message when no components have been generated yet', async () => {
    renderViewer(null);
    expect(
      await screen.findByText('No components have been generated for this lead yet.'),
    ).toBeInTheDocument();
  });
});
