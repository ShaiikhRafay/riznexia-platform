'use client';

import { useAnalyticsDashboard } from '../api/use-analytics-dashboard';
import { WidgetCard } from '../components/widget-card';
import { formatPercent } from '../format';
import { useDashboardPeriod } from '../use-dashboard-period';

export function ConversionWidget() {
  const { options } = useDashboardPeriod();
  const { data, isLoading, error, refetch } = useAnalyticsDashboard(options);

  return (
    <WidgetCard
      title="Conversion"
      isLoading={isLoading}
      error={error}
      onRetry={() => void refetch()}
    >
      <p className="text-display text-(--color-text-primary) font-semibold">
        {data ? formatPercent(data.widgets.conversion.overallRatePercent) : '—'}
      </p>
    </WidgetCard>
  );
}
