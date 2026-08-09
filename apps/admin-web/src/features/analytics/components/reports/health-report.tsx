import type { HealthReport } from '@riznexia/shared-types';
import { formatPercent, formatUsd } from '../../format';
import { DetailCard, FieldRow } from '../detail-primitives';

export function HealthReportView({ data }: { data: HealthReport }) {
  const total =
    data.deploymentHealth.healthy + data.deploymentHealth.unhealthy + data.deploymentHealth.unknown;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <DetailCard title="Cost Ceiling">
        <FieldRow label="Spent">{formatUsd(data.costCeiling.spentUsd)}</FieldRow>
        <FieldRow label="Ceiling">{formatUsd(data.costCeiling.ceilingUsd)}</FieldRow>
        <FieldRow label="Percent Used">{formatPercent(data.costCeiling.percentUsed)}</FieldRow>
      </DetailCard>

      <DetailCard title="Deployment Health">
        <FieldRow label="Healthy">{data.deploymentHealth.healthy}</FieldRow>
        <FieldRow label="Unhealthy">{data.deploymentHealth.unhealthy}</FieldRow>
        <FieldRow label="Unknown">{data.deploymentHealth.unknown}</FieldRow>
        {total > 0 ? (
          <div
            className="bg-(--color-bg-surface-raised) flex h-1.5 w-full overflow-hidden rounded-full"
            role="img"
            aria-label="Deployment health breakdown"
          >
            <div
              className="bg-(--color-success) h-full"
              style={{ width: `${(data.deploymentHealth.healthy / total) * 100}%` }}
            />
            <div
              className="bg-(--color-danger) h-full"
              style={{ width: `${(data.deploymentHealth.unhealthy / total) * 100}%` }}
            />
            <div
              className="bg-(--color-text-secondary) h-full"
              style={{ width: `${(data.deploymentHealth.unknown / total) * 100}%` }}
            />
          </div>
        ) : null}
        <FieldRow label="Recent Failures">{data.recentFailureCount}</FieldRow>
      </DetailCard>
    </div>
  );
}
