import type { DashboardWidgets } from '@riznexia/shared-types';
import { formatInteger, formatPercent, formatUsd } from '../../format';
import { DetailCard, FieldRow } from '../detail-primitives';

// Executive Dashboard (F12): "the same composed data the live dashboard
// renders — an export of it, not a second implementation" (the backend's
// own comment on `executive_dashboard`'s data shape, verified directly:
// it's exactly `DashboardWidgets`). This renders the same eight real
// fields the Analytics Dashboard page shows, compactly, as a printable/
// exportable snapshot rather than duplicating that page's own layout.
export function ExecutiveDashboardReportView({ data }: { data: DashboardWidgets }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <DetailCard title="Leads & Sales">
        <FieldRow label="Total Leads">{formatInteger(data.leads.totalLeads)}</FieldRow>
        <FieldRow label="Total Pipeline Value">
          {formatUsd(data.sales.totalPipelineValueUsd)}
        </FieldRow>
        <FieldRow label="Win Rate">{formatPercent(data.sales.winRatePercent)}</FieldRow>
        <FieldRow label="Conversion Rate">
          {formatPercent(data.conversion.overallRatePercent)}
        </FieldRow>
      </DetailCard>

      <DetailCard title="AI & Costs">
        <FieldRow label="Total Analyses">{formatInteger(data.aiUsage.totalAnalyses)}</FieldRow>
        <FieldRow label="Total Tokens">{formatInteger(data.aiUsage.totalTokens)}</FieldRow>
        <FieldRow label="Spent">{formatUsd(data.costs.spentUsd)}</FieldRow>
        <FieldRow label="Percent of Ceiling Used">{formatPercent(data.costs.percentUsed)}</FieldRow>
      </DetailCard>

      <DetailCard title="Deployments & Websites">
        <FieldRow label="Total Deployments">
          {formatInteger(data.deployments.totalDeployments)}
        </FieldRow>
        <FieldRow label="Deployment Success Rate">
          {formatPercent(data.deployments.successRatePercent)}
        </FieldRow>
        <FieldRow label="Total Websites Generated">
          {formatInteger(data.websiteStatus.totalGenerated)}
        </FieldRow>
        <FieldRow label="Average Publish Readiness">
          {data.websiteStatus.averagePublishReadinessScore === null
            ? '—'
            : data.websiteStatus.averagePublishReadinessScore.toFixed(1)}
        </FieldRow>
      </DetailCard>

      <DetailCard title="System Health">
        <FieldRow label="Healthy">{data.systemHealth.healthy}</FieldRow>
        <FieldRow label="Unhealthy">{data.systemHealth.unhealthy}</FieldRow>
        <FieldRow label="Unknown">{data.systemHealth.unknown}</FieldRow>
      </DetailCard>
    </div>
  );
}
