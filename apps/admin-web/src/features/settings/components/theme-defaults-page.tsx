'use client';

import { ErrorState, Skeleton } from '@riznexia/ui';
import Link from 'next/link';
import { useAnalyticsReport } from '@/src/features/analytics/api/use-analytics-report';
import { AnalyticsReportGate } from '@/src/features/analytics/components/analytics-report-gate';
import { ReportView } from '@/src/features/analytics/components/reports/report-view';
import { NotConfigurable } from './not-configurable';
import { SettingsAccessGate } from './settings-access-gate';
import { SettingsSubNav } from './settings-sub-nav';

// Theme Defaults (F13): `GET /analytics/reports/theme_usage`, gated
// `analytics:report` — real usage counts per theme (M12), reusing
// `ReportView`'s existing `ThemeUsageReportView` rendering. There is no
// "default theme" configuration endpoint anywhere — M7's `ThemeSelectionService`
// always ranks all 8 registered themes fresh per business, it never reads
// a stored default — so this page never duplicates Theme Engine's own
// selection logic (D-200), only shows real usage.
export function ThemeDefaultsPage() {
  return (
    <SettingsAccessGate>
      <div className="flex flex-col gap-6">
        <SettingsSubNav />
        <h1 className="text-h1 text-(--color-text-primary) font-semibold">Theme Defaults</h1>

        <AnalyticsReportGate>
          <ThemeUsageSection />
        </AnalyticsReportGate>

        <NotConfigurable title="Default Theme Configuration">
          <p>
            No default-theme setting exists — every business gets a fresh AI-recommended,
            compatibility-ranked theme selection (M7).{' '}
            <Link href="/theme-engine" className="text-(--color-accent) hover:underline">
              View Theme Engine →
            </Link>
          </p>
        </NotConfigurable>
      </div>
    </SettingsAccessGate>
  );
}

function ThemeUsageSection() {
  const { data, isLoading, error, refetch } = useAnalyticsReport('theme_usage', {
    period: 'monthly',
  });

  if (isLoading) {
    return <Skeleton className="h-32 w-full" />;
  }
  if (error) {
    return <ErrorState error={error} onRetry={() => void refetch()} />;
  }
  if (!data) {
    return null;
  }

  return <ReportView envelope={data} />;
}
