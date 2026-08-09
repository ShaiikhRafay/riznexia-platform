'use client';

import type { AggregationPeriod, AiCostReport } from '@riznexia/shared-types';
import { Button, ErrorState, Skeleton } from '@riznexia/ui';
import { useState } from 'react';
import { useAnalyticsReport } from '@/src/features/analytics/api/use-analytics-report';
import { AnalyticsReportGate } from '@/src/features/analytics/components/analytics-report-gate';
import { ReportView } from '@/src/features/analytics/components/reports/report-view';
import { SettingsAccessGate } from './settings-access-gate';
import { SettingsSubNav } from './settings-sub-nav';

const PERIODS: { value: AggregationPeriod; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

const WARNING_THRESHOLD_PERCENT = 80;

// Cost & Budget (F13): `GET /analytics/reports/ai_cost`, gated
// `analytics:report` — real spend/ceiling data (M12), reusing `ReportView`.
// A local Daily/Weekly/Monthly/Yearly toggle only — Custom Range is
// deliberately left out here (D-202): F12's own `PeriodRangeSelect` has a
// real, already-flagged bug where selecting Custom fires the query before
// `from`/`to` are picked, producing a 400 (see this module's code review).
// Rather than touch F12's shared hook for a page outside this brief's
// scope, this page just doesn't expose the broken path. The over-ceiling
// banner is computed client-side from the two real numbers the report
// already returns — never a fabricated threshold value.
export function CostBudgetPage() {
  const [period, setPeriod] = useState<AggregationPeriod>('monthly');
  const { data, isLoading, error, refetch } = useAnalyticsReport('ai_cost', { period });
  const report = data?.data as AiCostReport | undefined;
  const percentUsed =
    report && report.monthlyCeilingUsd > 0
      ? (report.currentMonthSpendUsd / report.monthlyCeilingUsd) * 100
      : 0;

  return (
    <SettingsAccessGate>
      <div className="flex flex-col gap-6">
        <SettingsSubNav />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-h1 text-(--color-text-primary) font-semibold">Cost & Budget</h1>
          <div className="flex gap-1">
            {PERIODS.map((option) => (
              <Button
                key={option.value}
                size="sm"
                variant={period === option.value ? 'primary' : 'secondary'}
                aria-pressed={period === option.value}
                onClick={() => setPeriod(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        <AnalyticsReportGate>
          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : error ? (
            <ErrorState error={error} onRetry={() => void refetch()} />
          ) : data ? (
            <>
              {percentUsed >= WARNING_THRESHOLD_PERCENT ? (
                <div className="border-(--color-warning) bg-(--color-warning)/10 text-(--color-warning) rounded-lg border p-4 text-sm">
                  {percentUsed.toFixed(0)}% of the monthly AI cost ceiling has been used.
                </div>
              ) : null}
              <ReportView envelope={data} />
            </>
          ) : null}
        </AnalyticsReportGate>
      </div>
    </SettingsAccessGate>
  );
}
