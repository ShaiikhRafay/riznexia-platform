'use client';

import { cn } from '@riznexia/ui';
import { useAnalyticsDashboard } from '../api/use-analytics-dashboard';
import { WidgetCard } from '../components/widget-card';
import { formatUsd } from '../format';
import { useDashboardPeriod } from '../use-dashboard-period';

export function CostsWidget() {
  const { options } = useDashboardPeriod();
  const { data, isLoading, error, refetch } = useAnalyticsDashboard(options);
  const costs = data?.widgets.costs;
  const percentUsed = costs ? Math.min(costs.percentUsed, 100) : 0;

  return (
    <WidgetCard title="Costs" isLoading={isLoading} error={error} onRetry={() => void refetch()}>
      <p className="text-display text-(--color-text-primary) font-semibold">
        {costs ? formatUsd(costs.spentUsd) : '—'}
      </p>
      <p className="text-caption text-(--color-text-secondary)">
        {costs ? `of ${formatUsd(costs.ceilingUsd)} ceiling` : '—'}
      </p>
      {costs ? (
        <div
          className="bg-(--color-bg-surface-raised) h-1.5 w-full overflow-hidden rounded-full"
          role="progressbar"
          aria-valuenow={percentUsed}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Monthly cost ceiling used"
        >
          <div
            className={cn(
              'h-full rounded-full',
              percentUsed >= 90
                ? 'bg-(--color-danger)'
                : percentUsed >= 70
                  ? 'bg-(--color-warning)'
                  : 'bg-(--color-accent)',
            )}
            style={{ width: `${percentUsed}%` }}
          />
        </div>
      ) : null}
    </WidgetCard>
  );
}
