'use client';

import { ErrorState, Skeleton } from '@riznexia/ui';
import Link from 'next/link';
import { useAnalyticsReport } from '@/src/features/analytics/api/use-analytics-report';
import { AnalyticsReportGate } from '@/src/features/analytics/components/analytics-report-gate';
import { ReportView } from '@/src/features/analytics/components/reports/report-view';
import { NotConfigurable, NotConfigurableField } from './not-configurable';
import { SettingsAccessGate } from './settings-access-gate';
import { SettingsSubNav } from './settings-sub-nav';

// Deployment Settings (F13): `GET /analytics/reports/deployment`, gated
// `analytics:report` — real deployment stats (M12), reusing `ReportView`.
// Provider/project/domain configuration (`VERCEL_TEAM_ID`, `GITHUB_ORG`,
// etc.) are server environment variables with no GET endpoint — the M11
// `DeploymentProvider` abstraction is a DI-time wiring choice
// (`VercelProvider` behind `DEPLOYMENT_PROVIDER`), not a stored, readable
// setting (D-201).
export function DeploymentSettingsPage() {
  return (
    <SettingsAccessGate>
      <div className="flex flex-col gap-6">
        <SettingsSubNav />
        <h1 className="text-h1 text-(--color-text-primary) font-semibold">Deployment Settings</h1>

        <AnalyticsReportGate>
          <DeploymentStatsSection />
        </AnalyticsReportGate>

        <NotConfigurable title="Provider Configuration">
          <p className="mb-3">
            No endpoint exposes the active deployment provider or project configuration.
          </p>
          <div className="flex flex-col gap-2">
            <NotConfigurableField label="Provider" />
            <NotConfigurableField label="Default Project" />
            <NotConfigurableField label="Production Domain" />
            <NotConfigurableField label="Preview Domain" />
            <NotConfigurableField label="Team" />
          </div>
          <p className="mt-3">
            <Link href="/deployment" className="text-(--color-accent) hover:underline">
              View Deployment Dashboard →
            </Link>
          </p>
        </NotConfigurable>
      </div>
    </SettingsAccessGate>
  );
}

function DeploymentStatsSection() {
  const { data, isLoading, error, refetch } = useAnalyticsReport('deployment', {
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
