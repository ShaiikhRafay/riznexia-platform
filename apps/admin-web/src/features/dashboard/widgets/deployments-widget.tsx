'use client';

import { useAnalyticsDashboard } from '../api/use-analytics-dashboard';
import { WidgetCard } from '../components/widget-card';
import { formatInteger, formatPercent } from '../format';
import { useDashboardPeriod } from '../use-dashboard-period';

export function DeploymentsWidget() {
  const { options } = useDashboardPeriod();
  const { data, isLoading, error, refetch } = useAnalyticsDashboard(options);

  return (
    <WidgetCard
      title="Deployments"
      isLoading={isLoading}
      error={error}
      onRetry={() => void refetch()}
    >
      <p className="text-display text-(--color-text-primary) font-semibold">
        {data ? formatInteger(data.widgets.deployments.totalDeployments) : '—'}
      </p>
      <p className="text-caption text-(--color-text-secondary)">
        {data ? formatPercent(data.widgets.deployments.successRatePercent) : '—'} success rate
      </p>
    </WidgetCard>
  );
}
