'use client';

import { useAnalyticsDashboard } from '../api/use-analytics-dashboard';
import { WidgetCard } from '../components/widget-card';
import { formatPercent, formatUsd } from '../format';
import { useDashboardPeriod } from '../use-dashboard-period';

export function SalesWidget() {
  const { options } = useDashboardPeriod();
  const { data, isLoading, error, refetch } = useAnalyticsDashboard(options);

  return (
    <WidgetCard title="Sales" isLoading={isLoading} error={error} onRetry={() => void refetch()}>
      <p className="text-display text-(--color-text-primary) font-semibold">
        {data ? formatUsd(data.widgets.sales.totalPipelineValueUsd) : '—'}
      </p>
      <p className="text-caption text-(--color-text-secondary)">
        {data ? formatPercent(data.widgets.sales.winRatePercent) : '—'} win rate
      </p>
    </WidgetCard>
  );
}
