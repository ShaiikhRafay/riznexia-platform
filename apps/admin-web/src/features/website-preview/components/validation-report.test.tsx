import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PermissionsProvider } from '@/src/lib/permissions-context';
import { ValidationReport } from './validation-report';

vi.mock('@clerk/nextjs', () => ({
  useAuth: () => ({ getToken: async () => 'test-token' }),
}));

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

const REPORT = {
  id: 'report-1',
  businessId: 'business-1',
  generatedWebsiteId: 'website-1',
  rules: [
    {
      ruleId: 'STRUCT-001',
      ruleCategory: 'structural',
      ruleName: 'Homepage exists',
      severity: 'critical',
      status: 'pass',
      message: 'Found app/page.tsx',
      recommendation: null,
      documentationUrl: null,
    },
    {
      ruleId: 'STRUCT-002',
      ruleCategory: 'structural',
      ruleName: 'Layout exists',
      severity: 'high',
      status: 'error',
      message: 'Missing app/layout.tsx',
      recommendation: 'Regenerate the website',
      documentationUrl: null,
    },
    {
      ruleId: 'SEO-001',
      ruleCategory: 'seo',
      ruleName: 'Meta description present',
      severity: 'medium',
      status: 'warning',
      message: 'Meta description is short',
      recommendation: 'Expand it',
      documentationUrl: null,
    },
  ],
  previewVersion: 1,
  generatedWebsiteVersion: 1,
  validationVersion: 'v1.0',
  generatedByModuleVersion: 'v1.0',
  validationTimestamp: '2026-01-01T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
};

function renderReport() {
  global.fetch = vi.fn(async () => jsonResponse(REPORT)) as unknown as typeof fetch;
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <PermissionsProvider role="admin">
        <ValidationReport leadId="lead-1" />
      </PermissionsProvider>
    </QueryClientProvider>,
  );
}

// Validation Report: `PreviewReport.rules` is a flat, mixed-category
// array — this test proves the client-side grouping by `ruleCategory`/
// `status` produces the founder-requested Passed/Failed/Warnings tally per
// category, without inventing a "Deductions" section this resource
// doesn't return.
describe('ValidationReport', () => {
  it('shows the Structural category by default with correct passed/failed/warning tallies', async () => {
    renderReport();

    expect(await screen.findByText('1 Passed')).toBeInTheDocument();
    expect(screen.getByText('1 Failed')).toBeInTheDocument();
    expect(screen.getByText('0 Warnings')).toBeInTheDocument();
    expect(screen.getByText('Layout exists')).toBeInTheDocument();
    expect(screen.getByText('Missing app/layout.tsx')).toBeInTheDocument();
    expect(screen.getByText('Recommendation: Regenerate the website')).toBeInTheDocument();
  });

  it('switches to the SEO category tab and shows its own warning', async () => {
    renderReport();
    await screen.findByText('1 Passed');

    await userEvent.click(screen.getByRole('tab', { name: 'SEO' }));

    expect(await screen.findByText('0 Passed')).toBeInTheDocument();
    expect(screen.getByText('1 Warnings')).toBeInTheDocument();
    expect(screen.getByText('Meta description present')).toBeInTheDocument();
  });

  it('never shows a "Deductions" section — that field does not exist on PreviewReport', async () => {
    renderReport();
    await screen.findByText('1 Passed');
    expect(screen.queryByText('Deductions')).not.toBeInTheDocument();
  });
});
