'use client';

import { ErrorState, Skeleton } from '@riznexia/ui';
import { useCrmDashboard } from '../api/use-crm-dashboard';
import { formatPercent, formatUsd } from '../format';

// Pipeline-by-stage renders as a hand-rolled horizontal bar list rather
// than pulling in a charting library — every value here is a single
// proportional bar against the section's own max, the same "hand-roll
// small well-defined visual logic instead of adding a dependency"
// precedent this codebase already follows elsewhere (bucket-math.ts,
// csv-formatter.ts). No F1 module named a chart library, and nothing in
// this section's actual data shape needs one.
export function CrmPipelineSection() {
  const { data, isLoading, error, refetch } = useCrmDashboard();

  if (isLoading) {
    return (
      <section className="border-(--color-border-default) bg-(--color-bg-surface) flex flex-col gap-4 rounded-lg border p-4">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-32 w-full" />
      </section>
    );
  }

  if (error) {
    return (
      <section className="border-(--color-border-default) bg-(--color-bg-surface) rounded-lg border p-4">
        <ErrorState error={error} onRetry={() => void refetch()} />
      </section>
    );
  }

  if (!data) {
    return null;
  }

  const maxStageValue = Math.max(
    1,
    ...data.pipelineValueByStage.map((stage) => stage.totalValueUsd),
  );

  return (
    <section className="border-(--color-border-default) bg-(--color-bg-surface) flex flex-col gap-6 rounded-lg border p-4">
      <div>
        <h2 className="text-h2 text-(--color-text-primary) font-semibold">Pipeline by Stage</h2>
        <p className="text-caption text-(--color-text-secondary)">
          {formatUsd(data.totalPipelineValueUsd)} total &middot;{' '}
          {formatPercent(data.winRatePercent)} win rate
        </p>
      </div>
      <ul className="flex flex-col gap-2">
        {data.pipelineValueByStage.map((stage) => (
          <li key={stage.stageId} className="flex items-center gap-3">
            <span className="text-(--color-text-secondary) w-32 shrink-0 truncate text-sm">
              {stage.stageName}
            </span>
            <div className="bg-(--color-bg-surface-raised) h-2 flex-1 overflow-hidden rounded-full">
              <div
                className="bg-(--color-accent) h-full rounded-full"
                style={{ width: `${(stage.totalValueUsd / maxStageValue) * 100}%` }}
              />
            </div>
            <span className="text-(--color-text-primary) w-24 shrink-0 text-right text-sm">
              {formatUsd(stage.totalValueUsd)}
            </span>
            <span className="text-caption text-(--color-text-secondary) w-16 shrink-0 text-right">
              {stage.leadCount} leads
            </span>
          </li>
        ))}
        {data.pipelineValueByStage.length === 0 ? (
          <li className="text-(--color-text-secondary) text-sm">No open pipeline value yet.</li>
        ) : null}
      </ul>

      {data.salesPerformanceByRep.length > 0 ? (
        <div>
          <h3 className="text-body-medium text-(--color-text-primary)">Sales Performance by Rep</h3>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-(--color-border-default) text-caption text-(--color-text-secondary) border-b">
                  <th className="py-2 pr-4 font-medium">Rep</th>
                  <th className="py-2 pr-4 font-medium">Open</th>
                  <th className="py-2 pr-4 font-medium">Won</th>
                  <th className="py-2 pr-4 font-medium">Lost</th>
                  <th className="py-2 font-medium">Won Value</th>
                </tr>
              </thead>
              <tbody>
                {data.salesPerformanceByRep.map((rep) => (
                  <tr
                    key={rep.ownerId ?? 'unassigned'}
                    className="border-(--color-border-default) border-b last:border-0"
                  >
                    <td className="text-(--color-text-primary) py-2 pr-4">
                      {rep.ownerName ?? 'Unassigned'}
                    </td>
                    <td className="text-(--color-text-secondary) py-2 pr-4">{rep.openCount}</td>
                    <td className="text-(--color-text-secondary) py-2 pr-4">{rep.wonCount}</td>
                    <td className="text-(--color-text-secondary) py-2 pr-4">{rep.lostCount}</td>
                    <td className="text-(--color-text-primary) py-2">
                      {formatUsd(rep.totalWonValueUsd)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </section>
  );
}
