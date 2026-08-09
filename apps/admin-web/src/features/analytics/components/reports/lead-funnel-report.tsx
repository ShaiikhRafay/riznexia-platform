import type { LeadFunnelReport } from '@riznexia/shared-types';
import { BarList } from '../bar-list';
import { DetailCard } from '../detail-primitives';

export function LeadFunnelReportView({ data }: { data: LeadFunnelReport }) {
  return (
    <DetailCard title="Sales Funnel">
      <p className="text-(--color-text-secondary) text-sm">Total leads: {data.totalLeads}</p>
      <BarList
        items={data.stages.map((stage) => ({
          key: stage.stageKey,
          label: stage.stageName,
          value: stage.count,
          valueLabel: String(stage.count),
        }))}
        emptyMessage="No pipeline stages yet."
      />
    </DetailCard>
  );
}
