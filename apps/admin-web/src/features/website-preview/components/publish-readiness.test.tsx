import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PermissionsProvider } from '@/src/lib/permissions-context';
import { PublishReadiness } from './publish-readiness';

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => 'test-token' }),
}));

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

function score(value: number, deductions: unknown[] = []) {
  return { score: value, maxScore: 100, deductions };
}

const REPORT = {
  id: 'readiness-1',
  businessId: 'business-1',
  generatedWebsiteId: 'website-1',
  seoScore: score(80, [
    {
      ruleId: 'SEO-001',
      ruleName: 'Meta description present',
      pointsDeducted: 20,
      reason: 'Meta description is short',
    },
  ]),
  accessibilityScore: score(100),
  performanceScore: score(90),
  contentCompletenessScore: score(75),
  structuralIntegrityScore: score(50),
  overallPublishScore: score(79),
  previewVersion: 1,
  generatedWebsiteVersion: 1,
  validationVersion: 'v1.0',
  generatedByModuleVersion: 'v1.0',
  createdAt: '2026-01-01T00:00:00.000Z',
};

function renderReadiness() {
  global.fetch = vi.fn(async () => jsonResponse(REPORT)) as unknown as typeof fetch;
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <PermissionsProvider role="admin">
        <PublishReadiness leadId="lead-1" />
      </PermissionsProvider>
    </QueryClientProvider>,
  );
}

// Publish Readiness: exactly the six ScoreBreakdown fields the backend
// returns — no "Publish Recommendation"/"Reasons" field exists on
// PublishReadinessReport, and deriving one from `overallPublishScore` on
// the frontend would itself violate "never calculate readiness on the
// frontend", so neither is ever rendered (DECISIONS.md D-174).
describe('PublishReadiness', () => {
  it('renders the overall score and all five category scores', async () => {
    renderReadiness();

    expect(await screen.findByRole('heading', { name: 'Overall Score' })).toBeInTheDocument();
    expect(screen.getByText('79')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'SEO Score' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Accessibility Score' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Performance Score' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Content Score' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Structure Score' })).toBeInTheDocument();
    expect(screen.getByText('80 / 100')).toBeInTheDocument();
  });

  it('shows each deduction with its rule name, points deducted, and reason', async () => {
    renderReadiness();
    const seoHeading = await screen.findByRole('heading', { name: 'SEO Score' });
    // h3 -> flex title/badge row -> CardHeader -> Card root; deductions
    // live in CardContent, a sibling of CardHeader, so the assertion must
    // scope to the shared Card root, not just the header.
    const seoCard = seoHeading.closest('div')?.parentElement?.parentElement as HTMLElement;

    expect(within(seoCard).getByText('Meta description present')).toBeInTheDocument();
    expect(within(seoCard).getByText(/-20 pts.*Meta description is short/)).toBeInTheDocument();
  });

  it('shows "No deductions." for a category with none', async () => {
    renderReadiness();
    await screen.findByRole('heading', { name: 'Accessibility Score' });
    expect(screen.getAllByText('No deductions.').length).toBeGreaterThan(0);
  });

  it('never invents a Publish Recommendation or Reasons field — neither exists on the backend response', async () => {
    renderReadiness();
    await screen.findByRole('heading', { name: 'Overall Score' });
    expect(screen.queryByText(/Publish Recommendation/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Reasons$/i)).not.toBeInTheDocument();
  });
});
