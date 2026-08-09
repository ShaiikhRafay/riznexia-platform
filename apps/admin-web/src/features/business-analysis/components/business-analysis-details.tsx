'use client';

import type { BusinessAnalysis } from '@riznexia/shared-types';
import { Button, ErrorState, Skeleton, StatusBadge } from '@riznexia/ui';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useBusinessAnalysis } from '../api/use-business-analysis';
import { ANALYSIS_STATUS_PRESENTATION } from '../status';
import { BusinessAnalysisProgress } from './business-analysis-progress';
import { RunAnalysisButton } from './run-analysis-button';

function DetailCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-(--color-border-default) bg-(--color-bg-surface) flex flex-col gap-3 rounded-lg border p-4">
      <h2 className="text-h2 text-(--color-text-primary) font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-(--color-text-secondary) shrink-0">{label}</span>
      <span className="text-(--color-text-primary) text-right">{children}</span>
    </div>
  );
}

function ListField({ label, items }: { label: string; items: readonly string[] }) {
  return (
    <div className="flex flex-col gap-1 text-sm">
      <span className="text-(--color-text-secondary)">{label}</span>
      {items.length > 0 ? (
        <ul className="text-(--color-text-primary) list-inside list-disc">
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <span className="text-(--color-text-secondary)">None</span>
      )}
    </div>
  );
}

function TextField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 text-sm">
      <span className="text-(--color-text-secondary)">{label}</span>
      <span className="text-(--color-text-primary)">{value}</span>
    </div>
  );
}

export interface BusinessAnalysisDetailsProps {
  leadId: string;
}

// Analysis Details (F6): displays every field `GET /leads/:id/business`
// actually returns. Deliberately does NOT show "Prompt Hash" — it exists
// on the Prisma model (`promptHash`) but is never serialized into the API
// response (verified directly against `business-analysis-response.dto.ts`
// and `businessAnalysisSchema`) — and does NOT show a persistent "Cache
// Status" field, since the backend's own cache-hit signal is only ever
// encoded in the trigger response's HTTP status code, never a field on
// the resource itself (see RunAnalysisButton's comment and DECISIONS.md).
export function BusinessAnalysisDetails({ leadId }: BusinessAnalysisDetailsProps) {
  const { data: analysis, isLoading, error, refetch } = useBusinessAnalysis(leadId);

  return (
    <div className="flex flex-col gap-6">
      <Button variant="ghost" size="sm" asChild className="self-start">
        <Link href="/business-analysis">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Business Analysis
        </Link>
      </Button>

      {isLoading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : !analysis ? (
        <div className="flex flex-col gap-4">
          <p className="text-(--color-text-secondary) text-sm">
            No analysis has been run for this lead yet.
          </p>
          <RunAnalysisButton leadId={leadId} hasExistingAnalysis={false} />
        </div>
      ) : (
        <AnalysisContent leadId={leadId} analysis={analysis} />
      )}
    </div>
  );
}

function AnalysisContent({ leadId, analysis }: { leadId: string; analysis: BusinessAnalysis }) {
  const presentation = ANALYSIS_STATUS_PRESENTATION[analysis.status];
  const brief = analysis.brandBrief;

  return (
    <>
      <div className="flex items-center justify-between">
        <h1 className="text-h1 text-(--color-text-primary) font-semibold">Analysis Details</h1>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" asChild>
            <Link href={`/business-analysis/${leadId}/history`}>View History</Link>
          </Button>
          <RunAnalysisButton leadId={leadId} hasExistingAnalysis />
        </div>
      </div>

      <BusinessAnalysisProgress status={analysis.status} />

      <div className="grid gap-4 md:grid-cols-2">
        <DetailCard title="Analysis Metadata">
          <FieldRow label="Status">
            <StatusBadge variant={presentation.variant} label={presentation.label} />
          </FieldRow>
          <FieldRow label="Analysis Version">{analysis.analysisVersion}</FieldRow>
          <FieldRow label="AI Provider">{analysis.aiProvider}</FieldRow>
          <FieldRow label="AI Model">{analysis.aiModel}</FieldRow>
          <FieldRow label="Prompt Name">{analysis.promptName}</FieldRow>
          <FieldRow label="Prompt Version">{analysis.promptVersion}</FieldRow>
          <FieldRow label="Created Date">{new Date(analysis.createdAt).toLocaleString()}</FieldRow>
        </DetailCard>

        <DetailCard title="Execution">
          <FieldRow label="AI Confidence Score">
            {analysis.confidenceScore !== null ? analysis.confidenceScore.toFixed(2) : '—'}
          </FieldRow>
          <FieldRow label="Execution Time">
            {analysis.executionTimeMs !== null
              ? `${(analysis.executionTimeMs / 1000).toFixed(1)}s`
              : '—'}
          </FieldRow>
          <FieldRow label="Estimated Cost">
            {analysis.estimatedCost !== null ? `$${analysis.estimatedCost.toFixed(4)}` : '—'}
          </FieldRow>
          <FieldRow label="Token Usage">
            {analysis.totalTokens !== null
              ? `${analysis.totalTokens} total (${analysis.promptTokens ?? 0} prompt / ${analysis.completionTokens ?? 0} completion)`
              : '—'}
          </FieldRow>
          {analysis.validationErrors && analysis.validationErrors.length > 0 ? (
            <div className="flex flex-col gap-1 text-sm">
              <span className="text-(--color-text-secondary)">Validation Errors</span>
              <ul className="text-(--color-danger) list-inside list-disc">
                {analysis.validationErrors.map((err) => (
                  <li key={err}>{err}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </DetailCard>
      </div>

      {brief ? (
        <div className="grid gap-4 md:grid-cols-2">
          <DetailCard title="Business Summary">
            <TextField label="Summary" value={brief.businessSummary} />
            <TextField label="Industry" value={brief.industry} />
            <TextField label="Tone of Voice" value={brief.toneOfVoice} />
            <TextField label="Layout Style" value={brief.layoutStyle} />
          </DetailCard>

          <DetailCard title="Audience &amp; Brand">
            <ListField label="Target Audience" items={brief.targetAudience} />
            <ListField label="Brand Personality" items={brief.brandPersonality} />
          </DetailCard>

          <DetailCard title="Services &amp; Selling Points">
            <ListField label="Primary Services" items={brief.primaryServices} />
            <ListField label="Secondary Services" items={brief.secondaryServices} />
            <ListField label="Unique Selling Points" items={brief.uniqueSellingPoints} />
          </DetailCard>

          <DetailCard title="Design">
            <div className="flex flex-col gap-1 text-sm">
              <span className="text-(--color-text-secondary)">Color Palette</span>
              <div className="flex flex-wrap gap-2">
                {Object.entries(brief.colorPalette).map(([key, hex]) => (
                  <span
                    key={key}
                    className="text-(--color-text-primary) flex items-center gap-1.5 text-xs"
                  >
                    <span
                      className="border-(--color-border-default) h-4 w-4 rounded-full border"
                      style={{ backgroundColor: hex }}
                    />
                    {key}: {hex}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1 text-sm">
              <span className="text-(--color-text-secondary)">Typography</span>
              <span className="text-(--color-text-primary)">
                Heading: {brief.typography.heading} &middot; Body: {brief.typography.body} &middot;
                Accent: {brief.typography.accent}
              </span>
            </div>
          </DetailCard>

          <DetailCard title="Website Sections">
            <ListField label="Website Sections" items={brief.websiteSections} />
          </DetailCard>

          <DetailCard title="SEO">
            <ListField label="SEO Keywords" items={brief.seoKeywords} />
            <ListField label="Local SEO Suggestions" items={brief.localSeoSuggestions} />
          </DetailCard>

          <DetailCard title="Conversion">
            <ListField label="CTA Recommendations" items={brief.ctaRecommendations} />
            <ListField label="Trust Signals" items={brief.trustSignals} />
            <ListField label="Social Proof Suggestions" items={brief.socialProofSuggestions} />
          </DetailCard>

          <DetailCard title="Content">
            <ListField label="Image Recommendations" items={brief.imageRecommendations} />
            <ListField label="Content Recommendations" items={brief.contentRecommendations} />
          </DetailCard>
        </div>
      ) : (
        <DetailCard title="Structured Output">
          <p className="text-(--color-text-secondary) text-sm">
            {analysis.status === 'pending'
              ? 'Waiting for the AI provider to respond…'
              : 'No structured output was produced.'}
          </p>
        </DetailCard>
      )}
    </>
  );
}
