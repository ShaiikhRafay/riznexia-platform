import type { AiUsageReport } from '@riznexia/shared-types';
import { formatInteger, formatMs } from '../../format';
import { BarList } from '../bar-list';
import { DetailCard, FieldRow } from '../detail-primitives';

export function AiUsageReportView({ data }: { data: AiUsageReport }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <DetailCard title="AI Usage">
        <FieldRow label="Total Analyses">{formatInteger(data.totalAnalyses)}</FieldRow>
        <FieldRow label="Total Tokens">{formatInteger(data.totalTokens)}</FieldRow>
        <FieldRow label="Average Execution Time">{formatMs(data.averageExecutionTimeMs)}</FieldRow>
      </DetailCard>

      <DetailCard title="Usage by Model">
        <BarList
          items={data.byModel.map((entry) => ({
            key: entry.aiModel,
            label: entry.aiModel,
            value: entry.totalTokens,
            valueLabel: formatInteger(entry.totalTokens),
          }))}
          emptyMessage="No model usage yet."
        />
      </DetailCard>

      <DetailCard title="Usage by Status">
        <BarList
          items={data.byStatus.map((entry) => ({
            key: entry.label,
            label: entry.label,
            value: entry.count,
            valueLabel: String(entry.count),
          }))}
          emptyMessage="No status data yet."
        />
      </DetailCard>
    </div>
  );
}
