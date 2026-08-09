import type { AiCostReport } from '@riznexia/shared-types';
import { formatUsd } from '../../format';
import { BarList } from '../bar-list';
import { DetailCard, FieldRow } from '../detail-primitives';

export function AiCostReportView({ data }: { data: AiCostReport }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <DetailCard title="AI Cost">
        <FieldRow label="Total Cost">{formatUsd(data.totalCostUsd)}</FieldRow>
        <FieldRow label="Current Month Spend">{formatUsd(data.currentMonthSpendUsd)}</FieldRow>
        <FieldRow label="Monthly Ceiling">{formatUsd(data.monthlyCeilingUsd)}</FieldRow>
      </DetailCard>

      <DetailCard title="Cost by Event Type">
        <BarList
          items={data.byEventType.map((entry) => ({
            key: entry.eventType,
            label: entry.eventType,
            value: entry.costUsd,
            valueLabel: formatUsd(entry.costUsd),
          }))}
          emptyMessage="No cost events yet."
        />
      </DetailCard>

      <DetailCard title="Cost by Period">
        <BarList
          items={data.byPeriod.map((bucket) => ({
            key: bucket.periodStart,
            label: new Date(bucket.periodStart).toLocaleDateString(),
            value: bucket.value,
            valueLabel: formatUsd(bucket.value),
          }))}
          emptyMessage="No period data yet."
        />
      </DetailCard>
    </div>
  );
}
