import type { SalesPerformanceReport } from '@riznexia/shared-types';
import { formatPercent, formatUsd } from '../../format';
import { BarList } from '../bar-list';
import { DetailCard, FieldRow } from '../detail-primitives';

// Sales Performance (F12): a direct passthrough of M10's own
// `DashboardStats` (founder's explicit Decision 2) — same fields F10's
// `ReportsPage` already renders; this is a feature-local presentation,
// not a re-derivation of any number.
export function SalesPerformanceReportView({ data }: { data: SalesPerformanceReport }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <DetailCard title="Pipeline Value by Stage">
        <BarList
          items={data.pipelineValueByStage.map((stage) => ({
            key: stage.stageId,
            label: stage.stageName,
            value: stage.totalValueUsd,
            valueLabel: formatUsd(stage.totalValueUsd),
          }))}
          emptyMessage="No open pipeline value yet."
        />
        <FieldRow label="Total Pipeline Value">{formatUsd(data.totalPipelineValueUsd)}</FieldRow>
      </DetailCard>

      <DetailCard title="Conversion & Win Rate">
        <FieldRow label="Conversion Rate">{formatPercent(data.conversionRatePercent)}</FieldRow>
        <FieldRow label="Win Rate">{formatPercent(data.winRatePercent)}</FieldRow>
        <FieldRow label="Average Sales Cycle">
          {data.averageSalesCycleDays === null ? '—' : `${data.averageSalesCycleDays} days`}
        </FieldRow>
      </DetailCard>

      <DetailCard title="Sales Performance by Rep">
        <BarList
          items={data.salesPerformanceByRep.map((rep) => ({
            key: rep.ownerId ?? 'unassigned',
            label: rep.ownerName ?? 'Unassigned',
            value: rep.totalWonValueUsd,
            valueLabel: formatUsd(rep.totalWonValueUsd),
          }))}
          emptyMessage="No sales performance data yet."
        />
      </DetailCard>

      <DetailCard title="Lost Reasons">
        <BarList
          items={data.lostReasonsBreakdown.map((reason) => ({
            key: reason.lostReasonId ?? 'unknown',
            label: reason.lostReasonLabel ?? 'Unspecified',
            value: reason.count,
            valueLabel: String(reason.count),
          }))}
          emptyMessage="No lost leads yet."
        />
      </DetailCard>
    </div>
  );
}
