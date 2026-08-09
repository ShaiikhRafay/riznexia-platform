import type { DeploymentReport } from '@riznexia/shared-types';
import { formatMs, formatPercent } from '../../format';
import { BarList } from '../bar-list';
import { DetailCard, FieldRow } from '../detail-primitives';

export function DeploymentReportView({ data }: { data: DeploymentReport }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <DetailCard title="Deployment Report">
        <FieldRow label="Total Deployments">{data.totalDeployments}</FieldRow>
        <FieldRow label="Success Rate">{formatPercent(data.successRatePercent)}</FieldRow>
        <FieldRow label="Average Duration">{formatMs(data.averageExecutionDurationMs)}</FieldRow>
      </DetailCard>

      <DetailCard title="By Status">
        <BarList
          items={data.byStatus.map((entry) => ({
            key: entry.label,
            label: entry.label,
            value: entry.count,
            valueLabel: String(entry.count),
          }))}
          emptyMessage="No deployments yet."
        />
      </DetailCard>

      <DetailCard title="By Provider">
        <BarList
          items={data.byProvider.map((entry) => ({
            key: entry.label,
            label: entry.label,
            value: entry.count,
            valueLabel: String(entry.count),
          }))}
          emptyMessage="No deployments yet."
        />
      </DetailCard>
    </div>
  );
}
