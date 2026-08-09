import type { TeamRole } from '@riznexia/shared-types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PermissionsProvider } from '@/src/lib/permissions-context';
import { BusinessAnalysisDetails } from './business-analysis-details';

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
  primaryServices: ['Breakfast', 'Lunch'],
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
  websiteSections: ['Hero', 'Menu', 'Contact'],
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
  analysisVersion: 2,
  promptName: 'brand-brief-v1',
  promptVersion: '1.0.0',
  aiProvider: 'claude',
  aiModel: 'claude-sonnet-5',
  status: 'completed',
  brandBrief: BRAND_BRIEF,
  confidenceScore: 0.87,
  validationErrors: null,
  executionTimeMs: 4200,
  completedAt: '2026-01-01T00:00:05.000Z',
  promptTokens: 150,
  completionTokens: 350,
  totalTokens: 500,
  estimatedCost: 0.0234,
  createdAt: '2026-01-01T00:00:00.000Z',
};

function renderAs(role: TeamRole, response: unknown, status = 200) {
  global.fetch = vi.fn(async () => jsonResponse(response, status)) as unknown as typeof fetch;
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <PermissionsProvider role={role}>
        <BusinessAnalysisDetails leadId="lead-1" />
      </PermissionsProvider>
    </QueryClientProvider>,
  );
}

// Analysis Details (F6): displays every field GET /leads/:id/business
// actually returns — never Prompt Hash (not in the response at all),
// never a persistent Cache Status field (only ever a transient toast
// right after triggering — see RunAnalysisButton).
describe('BusinessAnalysisDetails', () => {
  it('renders metadata, execution info, and every brandBrief field for a completed analysis', async () => {
    renderAs('admin', COMPLETED_ANALYSIS);

    expect(await screen.findByText('brand-brief-v1')).toBeInTheDocument();
    expect(screen.getByText('1.0.0')).toBeInTheDocument();
    expect(screen.getByText('claude')).toBeInTheDocument();
    expect(screen.getByText('claude-sonnet-5')).toBeInTheDocument();
    expect(screen.getByText('0.87')).toBeInTheDocument();
    expect(screen.getByText('4.2s')).toBeInTheDocument();
    expect(screen.getByText('$0.0234')).toBeInTheDocument();
    expect(screen.getByText('500 total (150 prompt / 350 completion)')).toBeInTheDocument();

    expect(screen.getByText('A cozy neighborhood diner.')).toBeInTheDocument();
    expect(screen.getByText('Food & Beverage')).toBeInTheDocument();
    expect(screen.getByText('Families')).toBeInTheDocument();
    expect(screen.getByText('Warm')).toBeInTheDocument();
    expect(screen.getByText('24/7 service')).toBeInTheDocument();
    expect(screen.getByText('Modern grid')).toBeInTheDocument();
    expect(screen.getByText('Hero')).toBeInTheDocument();
    expect(screen.getByText('diner near me')).toBeInTheDocument();
    expect(screen.getByText('Order Now')).toBeInTheDocument();
    expect(screen.getByText('Highlight daily specials')).toBeInTheDocument();
  });

  it('never renders a Prompt Hash field — that data is not returned by the backend', async () => {
    renderAs('admin', COMPLETED_ANALYSIS);
    await screen.findByText('brand-brief-v1');

    expect(screen.queryByText(/prompt hash/i)).not.toBeInTheDocument();
  });

  it('never renders a persistent Cache Status field on Details', async () => {
    renderAs('admin', COMPLETED_ANALYSIS);
    await screen.findByText('brand-brief-v1');

    expect(screen.queryByText(/cache status/i)).not.toBeInTheDocument();
  });

  it('shows validation errors when the backend returns them on a failed analysis', async () => {
    renderAs('admin', {
      ...COMPLETED_ANALYSIS,
      status: 'failed',
      brandBrief: null,
      validationErrors: ['Missing required field: industry'],
    });

    expect(await screen.findByText('Missing required field: industry')).toBeInTheDocument();
    expect(screen.getByText('No structured output was produced.')).toBeInTheDocument();
  });

  it('offers to run an analysis when none exists yet', async () => {
    renderAs('admin', null);
    expect(
      await screen.findByText('No analysis has been run for this lead yet.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Run AI Analysis' })).toBeInTheDocument();
  });

  it('shows an inline ErrorState on a backend failure', async () => {
    renderAs('admin', { error: { code: 'RESOURCE_NOT_FOUND', message: 'Lead not found' } }, 404);
    expect(await screen.findByText('Lead not found')).toBeInTheDocument();
  });
});
