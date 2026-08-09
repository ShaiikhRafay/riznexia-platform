'use client';

import { Button, ErrorState, Skeleton, StatusBadge } from '@riznexia/ui';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useBusinessAnalysis } from '../api/use-business-analysis';
import { ANALYSIS_STATUS_PRESENTATION } from '../status';

export interface BusinessAnalysisHistoryProps {
  leadId: string;
}

// Analysis History (F6, founder-approved-by-brief resolution): "If
// backend only returns latest analysis, display latest only. Do not
// fabricate history." Verified directly against
// `business-analysis.service.ts`/`.controller.ts`: there is no
// history/versions endpoint anywhere in this module —
// `findLatestForLead()` is the only read path, returning strictly the
// single newest row by `analysisVersion`. `analysisVersion` does
// increment on every re-run, and old rows are never deleted, but nothing
// exposes them for reading. This page therefore shows exactly one row —
// the latest — with an explicit, honest note about why there is no list
// above or below it, rather than presenting a single-row table that
// silently implies more could exist.
export function BusinessAnalysisHistory({ leadId }: BusinessAnalysisHistoryProps) {
  const { data: analysis, isLoading, error, refetch } = useBusinessAnalysis(leadId);

  return (
    <div className="flex flex-col gap-6">
      <Button variant="ghost" size="sm" asChild className="self-start">
        <Link href="/business-analysis">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Business Analysis
        </Link>
      </Button>
      <h1 className="text-h1 text-(--color-text-primary) font-semibold">Analysis History</h1>

      {isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : !analysis ? (
        <p className="text-(--color-text-secondary) text-sm">
          No analysis has ever been run for this lead.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-(--color-text-secondary) text-sm">
            The backend only retains the latest analysis per lead — earlier versions are not
            retrievable, so only one entry is shown below.
          </p>
          <div className="border-(--color-border-default) bg-(--color-bg-surface) flex items-center justify-between rounded-lg border p-4">
            <div className="flex flex-col gap-1">
              <span className="text-(--color-text-primary) text-sm font-medium">
                Version {analysis.analysisVersion}
              </span>
              <span className="text-(--color-text-secondary) text-xs">
                Created {new Date(analysis.createdAt).toLocaleString()}
              </span>
              {analysis.completedAt ? (
                <span className="text-(--color-text-secondary) text-xs">
                  Completed {new Date(analysis.completedAt).toLocaleString()}
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge
                variant={ANALYSIS_STATUS_PRESENTATION[analysis.status].variant}
                label={ANALYSIS_STATUS_PRESENTATION[analysis.status].label}
              />
              <Button variant="secondary" size="sm" asChild>
                <Link href={`/business-analysis/${leadId}`}>View Details</Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
