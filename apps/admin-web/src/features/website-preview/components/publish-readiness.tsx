'use client';

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ErrorState,
  Skeleton,
  StatusBadge,
} from '@riznexia/ui';
import type { PublishReadinessReport, ScoreBreakdown } from '@riznexia/shared-types';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { PermissionGate } from '@/src/components/auth/permission-gate';
import { ApiError } from '@/src/lib/api-client';
import { useReadinessReport } from '../api/use-readiness-report';

export interface PublishReadinessProps {
  leadId: string;
}

// Publish Readiness (F9): "Overall Score, SEO Score, Accessibility Score,
// Performance Score, Content Score, Structure Score, Publish
// Recommendation, Reasons, Deductions", "Never calculate readiness on the
// frontend." `publishReadinessReportSchema` has exactly six score fields
// (each a `ScoreBreakdown { score, maxScore, deductions }`) — confirmed by
// reading the schema directly — and no `publishRecommendation`/`reasons`
// field anywhere. "Publish Recommendation" and "Reasons" are omitted
// rather than derived from `overallPublishScore.score` via a frontend
// threshold: the brief's own "never calculate readiness on the frontend"
// rule forbids the only way to produce them, so no compliant
// implementation exists — this isn't a judgment call, it's forced.
// `ScoreDeduction.reason` (one per deduction, not a separate top-level
// list) is shown inline with each deduction rather than invented as a
// standalone "Reasons" section. See DECISIONS.md D-174.
export function PublishReadiness({ leadId }: PublishReadinessProps) {
  const { data: report, isLoading, error, refetch } = useReadinessReport(leadId);

  return (
    <div className="flex flex-col gap-6">
      <Button variant="ghost" size="sm" asChild className="self-start">
        <Link href={`/website-preview?leadId=${leadId}`}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Website Preview
        </Link>
      </Button>
      <h1 className="text-h1 text-(--color-text-primary) font-semibold">Publish Readiness</h1>

      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : error ? (
        error instanceof ApiError && error.code === 'GENERATED_WEBSITE_NOT_FOUND' ? (
          <p className="text-(--color-text-secondary) text-sm">
            No generated website exists yet for this lead — run Website Generator first.
          </p>
        ) : (
          <ErrorState error={error} onRetry={() => void refetch()} />
        )
      ) : report ? (
        <PermissionGate
          permission="website:preview"
          fallback={
            <p className="text-(--color-text-secondary) text-sm">
              You don&rsquo;t have permission to open the publish readiness report.
            </p>
          }
        >
          <ReadinessScores report={report} />
        </PermissionGate>
      ) : null}
    </div>
  );
}

function ReadinessScores({ report }: { report: PublishReadinessReport }) {
  return (
    <div className="flex flex-col gap-4">
      <ScoreCard title="Overall Score" breakdown={report.overallPublishScore} emphasized />
      <div className="grid gap-4 md:grid-cols-2">
        <ScoreCard title="SEO Score" breakdown={report.seoScore} />
        <ScoreCard title="Accessibility Score" breakdown={report.accessibilityScore} />
        <ScoreCard title="Performance Score" breakdown={report.performanceScore} />
        <ScoreCard title="Content Score" breakdown={report.contentCompletenessScore} />
        <ScoreCard title="Structure Score" breakdown={report.structuralIntegrityScore} />
      </div>
    </div>
  );
}

function ScoreCard({
  title,
  breakdown,
  emphasized = false,
}: {
  title: string;
  breakdown: ScoreBreakdown;
  emphasized?: boolean;
}) {
  const variant = breakdown.score >= 90 ? 'success' : breakdown.score >= 70 ? 'warning' : 'danger';

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{title}</CardTitle>
          <StatusBadge variant={variant} label={`${breakdown.score} / ${breakdown.maxScore}`} />
        </div>
      </CardHeader>
      {emphasized ? (
        <CardContent>
          <p className="text-h1 text-(--color-text-primary) font-semibold">{breakdown.score}</p>
        </CardContent>
      ) : null}
      {breakdown.deductions.length > 0 ? (
        <CardContent>
          <p className="text-(--color-text-secondary) text-xs font-medium">Deductions</p>
          <ul className="flex flex-col gap-1">
            {breakdown.deductions.map((deduction) => (
              <li key={deduction.ruleId} className="text-sm">
                <span className="text-(--color-text-primary) font-medium">
                  {deduction.ruleName}
                </span>
                <span className="text-(--color-text-secondary)">
                  {' '}
                  -{deduction.pointsDeducted} pts — {deduction.reason}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      ) : (
        <CardContent>
          <p className="text-(--color-text-secondary) text-sm">No deductions.</p>
        </CardContent>
      )}
    </Card>
  );
}
