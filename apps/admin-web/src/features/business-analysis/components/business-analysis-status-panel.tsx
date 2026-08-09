'use client';

import { ErrorState, Skeleton } from '@riznexia/ui';
import Link from 'next/link';
import { useBusinessAnalysis } from '../api/use-business-analysis';
import { BusinessAnalysisProgress } from './business-analysis-progress';
import { RunAnalysisButton } from './run-analysis-button';

function executionStatusLabel(status: string, executionTimeMs: number | null): string {
  if (status === 'completed') {
    return executionTimeMs !== null
      ? `Completed in ${(executionTimeMs / 1000).toFixed(1)}s`
      : 'Completed';
  }
  if (status === 'failed') {
    return 'Failed — see Analysis Details for the error';
  }
  return 'Waiting for the AI provider to respond…';
}

export interface BusinessAnalysisStatusPanelProps {
  leadId: string;
  businessName: string;
}

// Business Analysis Dashboard (F6): "View current analysis status", "Run
// AI Analysis"/"Re-run Analysis", "Display analysis version", "Display
// provider/model information", "Display execution status" — all for the
// currently-selected lead. Cache status has no persistent field to show
// here (see RunAnalysisButton's own comment) — it only surfaces as a
// one-time toast immediately after triggering.
export function BusinessAnalysisStatusPanel({
  leadId,
  businessName,
}: BusinessAnalysisStatusPanelProps) {
  const { data: analysis, isLoading, error, refetch } = useBusinessAnalysis(leadId);

  return (
    <section className="border-(--color-border-default) bg-(--color-bg-surface) flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-h2 text-(--color-text-primary) font-semibold">{businessName}</h2>
        <RunAnalysisButton leadId={leadId} hasExistingAnalysis={!!analysis} />
      </div>

      {isLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : !analysis ? (
        <p className="text-(--color-text-secondary) text-sm">
          No analysis has been run for this lead yet.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <BusinessAnalysisProgress status={analysis.status} />
          <p className="text-(--color-text-secondary) text-sm">
            {executionStatusLabel(analysis.status, analysis.executionTimeMs)}
          </p>
          <div className="text-(--color-text-secondary) flex flex-wrap gap-4 text-sm">
            <span>
              Version{' '}
              <span className="text-(--color-text-primary)">{analysis.analysisVersion}</span>
            </span>
            <span>
              Provider <span className="text-(--color-text-primary)">{analysis.aiProvider}</span>
            </span>
            <span>
              Model <span className="text-(--color-text-primary)">{analysis.aiModel}</span>
            </span>
          </div>
          <Link
            href={`/business-analysis/${leadId}`}
            className="text-(--color-accent) self-start text-sm font-medium hover:underline"
          >
            View full details
          </Link>
        </div>
      )}
    </section>
  );
}
