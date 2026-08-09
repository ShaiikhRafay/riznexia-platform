import type { ConversionRateReport } from '@riznexia/shared-types';
import { formatPercent } from '../../format';
import { BarList } from '../bar-list';
import { DetailCard, FieldRow } from '../detail-primitives';

export function ConversionRateReportView({ data }: { data: ConversionRateReport }) {
  return (
    <DetailCard title="Conversion Report">
      <FieldRow label="Overall Conversion Rate">{formatPercent(data.overallRatePercent)}</FieldRow>
      <BarList
        items={data.byPeriod.map((bucket) => ({
          key: bucket.periodStart,
          label: new Date(bucket.periodStart).toLocaleDateString(),
          value: bucket.value,
          valueLabel: formatPercent(bucket.value),
        }))}
        emptyMessage="No period data yet."
      />
    </DetailCard>
  );
}
