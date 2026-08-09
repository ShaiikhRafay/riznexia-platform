import type { ThemeUsageReport } from '@riznexia/shared-types';
import { BarList } from '../bar-list';
import { DetailCard } from '../detail-primitives';

export function ThemeUsageReportView({ data }: { data: ThemeUsageReport }) {
  return (
    <DetailCard title="Theme Report">
      <BarList
        items={data.byTheme.map((entry) => ({
          key: entry.themeId,
          label: entry.themeName,
          value: entry.count,
          valueLabel: String(entry.count),
        }))}
        emptyMessage="No theme usage yet."
      />
    </DetailCard>
  );
}
