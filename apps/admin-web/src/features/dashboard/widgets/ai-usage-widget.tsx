'use client';

import { useAnalyticsDashboard } from '../api/use-analytics-dashboard';
import { WidgetCard } from '../components/widget-card';
import { formatInteger } from '../format';
import { useDashboardPeriod } from '../use-dashboard-period';

export function AiUsageWidget() {
  const { options } = useDashboardPeriod();
  const { data, isLoading, error, refetch } = useAnalyticsDashboard(options);

  return (
    <WidgetCard title="AI Usage" isLoading={isLoading} error={error} onRetry={() => void refetch()}>
      <p className="text-display text-(--color-text-primary) font-semibold">
        {data ? formatInteger(data.widgets.aiUsage.totalAnalyses) : '—'}
      </p>
      <p className="text-caption text-(--color-text-secondary)">
        {data ? formatInteger(data.widgets.aiUsage.totalTokens) : '—'} tokens
      </p>
    </WidgetCard>
  );
}
