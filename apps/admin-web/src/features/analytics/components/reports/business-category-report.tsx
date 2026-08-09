import type { BusinessCategoryReport } from '@riznexia/shared-types';
import { BarList } from '../bar-list';
import { DetailCard } from '../detail-primitives';

export function BusinessCategoryReportView({ data }: { data: BusinessCategoryReport }) {
  return (
    <DetailCard title="Category Report">
      <BarList
        items={data.byCategory.map((entry) => ({
          key: entry.label,
          label: entry.label,
          value: entry.count,
          valueLabel: String(entry.count),
        }))}
        emptyMessage="No category data yet."
      />
    </DetailCard>
  );
}
