import type { WebsiteGenerationReport } from '@riznexia/shared-types';
import { formatInteger } from '../../format';
import { BarList } from '../bar-list';
import { DetailCard, FieldRow } from '../detail-primitives';

export function WebsiteGenerationReportView({ data }: { data: WebsiteGenerationReport }) {
  return (
    <DetailCard title="Website Generation Report">
      <FieldRow label="Total Generated">{formatInteger(data.totalGenerated)}</FieldRow>
      <FieldRow label="Average Publish Readiness Score">
        {data.averagePublishReadinessScore === null
          ? '—'
          : data.averagePublishReadinessScore.toFixed(1)}
      </FieldRow>
      <BarList
        items={data.byPeriod.map((bucket) => ({
          key: bucket.periodStart,
          label: new Date(bucket.periodStart).toLocaleDateString(),
          value: bucket.value,
          valueLabel: formatInteger(bucket.value),
        }))}
        emptyMessage="No period data yet."
      />
    </DetailCard>
  );
}
