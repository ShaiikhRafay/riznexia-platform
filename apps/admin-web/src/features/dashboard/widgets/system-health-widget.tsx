'use client';

import { useAnalyticsDashboard } from '../api/use-analytics-dashboard';
import { WidgetCard } from '../components/widget-card';
import { formatInteger } from '../format';
import { useDashboardPeriod } from '../use-dashboard-period';

export function SystemHealthWidget() {
  const { options } = useDashboardPeriod();
  const { data, isLoading, error, refetch } = useAnalyticsDashboard(options);
  const health = data?.widgets.systemHealth;
  const total = health ? health.healthy + health.unhealthy + health.unknown : 0;

  return (
    <WidgetCard
      title="System Health"
      isLoading={isLoading}
      error={error}
      onRetry={() => void refetch()}
    >
      <p className="text-display text-(--color-text-primary) font-semibold">
        {health ? formatInteger(health.healthy) : '—'}
      </p>
      <p className="text-caption text-(--color-text-secondary)">
        {health
          ? `${formatInteger(health.unhealthy)} unhealthy, ${formatInteger(health.unknown)} unknown`
          : '—'}
      </p>
      {health && total > 0 ? (
        <div
          className="bg-(--color-bg-surface-raised) flex h-1.5 w-full overflow-hidden rounded-full"
          role="img"
          aria-label="Deployment health breakdown"
        >
          <div
            className="bg-(--color-success) h-full"
            style={{ width: `${(health.healthy / total) * 100}%` }}
          />
          <div
            className="bg-(--color-danger) h-full"
            style={{ width: `${(health.unhealthy / total) * 100}%` }}
          />
          <div
            className="bg-(--color-text-secondary) h-full"
            style={{ width: `${(health.unknown / total) * 100}%` }}
          />
        </div>
      ) : null}
    </WidgetCard>
  );
}
