'use client';

import { ErrorState, Skeleton } from '@riznexia/ui';
import Link from 'next/link';
import { useAnalyticsReport } from '@/src/features/analytics/api/use-analytics-report';
import { AnalyticsReportGate } from '@/src/features/analytics/components/analytics-report-gate';
import { ReportView } from '@/src/features/analytics/components/reports/report-view';
import { NotConfigurable, NotConfigurableField } from './not-configurable';
import { SettingsAccessGate } from './settings-access-gate';
import { SettingsSubNav } from './settings-sub-nav';

// AI Settings (F13): `GET /analytics/reports/ai_usage`, gated
// `analytics:report` — real usage stats (M12), reusing `AiUsageReportView`
// verbatim rather than re-rendering the same shape a second way. Fixed to
// a `monthly` window (no period selector) — this is a settings summary,
// not a report browser; the full Reports page already covers drill-down.
// Provider/Model/Temperature/Max Tokens are compile-time constants inside
// `packages/ai` (`DEFAULT_MAX_TOKENS`, the sole `AnthropicProvider`) with
// no GET endpoint returning them at runtime — displaying a guessed current
// value would be inventing data no API actually serves, so they're
// `NotConfigurable` (D-197). AI Budget lives on the Cost & Budget page
// (same `ai_cost` report) rather than being fetched a second time here.
export function AiSettingsPage() {
  return (
    <SettingsAccessGate>
      <div className="flex flex-col gap-6">
        <SettingsSubNav />
        <h1 className="text-h1 text-(--color-text-primary) font-semibold">AI Settings</h1>

        <AnalyticsReportGate>
          <AiUsageSection />
        </AnalyticsReportGate>

        <NotConfigurable title="Model Configuration">
          <p className="mb-3">
            No backend endpoint exposes the current provider/model/generation settings — configured
            via server environment variables only.
          </p>
          <div className="flex flex-col gap-2">
            <NotConfigurableField label="Default AI Provider" />
            <NotConfigurableField label="Default Model" />
            <NotConfigurableField label="Temperature" />
            <NotConfigurableField label="Max Tokens" />
            <NotConfigurableField label="AI Limits" />
          </div>
          <p className="mt-3">
            <Link href="/settings/cost-budget" className="text-(--color-accent) hover:underline">
              View AI Budget →
            </Link>
          </p>
        </NotConfigurable>
      </div>
    </SettingsAccessGate>
  );
}

function AiUsageSection() {
  const { data, isLoading, error, refetch } = useAnalyticsReport('ai_usage', { period: 'monthly' });

  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }
  if (error) {
    return <ErrorState error={error} onRetry={() => void refetch()} />;
  }
  if (!data) {
    return null;
  }

  return <ReportView envelope={data} />;
}
