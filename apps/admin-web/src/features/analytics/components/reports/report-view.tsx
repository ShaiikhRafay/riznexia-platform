import type {
  AiCostReport,
  AiUsageReport,
  AuditReport,
  AnalyticsReportEnvelope,
  BusinessCategoryReport,
  ConversionRateReport,
  DashboardWidgets,
  DeploymentReport,
  ErrorReport,
  HealthReport,
  IndustryReport,
  LeadFunnelReport,
  SalesPerformanceReport,
  ThemeUsageReport,
  UserActivityReport,
  WebsiteGenerationReport,
} from '@riznexia/shared-types';
import { AiCostReportView } from './ai-cost-report';
import { AiUsageReportView } from './ai-usage-report';
import { AuditReportView } from './audit-report';
import { BusinessCategoryReportView } from './business-category-report';
import { ConversionRateReportView } from './conversion-rate-report';
import { DeploymentReportView } from './deployment-report';
import { ErrorReportView } from './error-report';
import { ExecutiveDashboardReportView } from './executive-dashboard-report';
import { HealthReportView } from './health-report';
import { IndustryReportView } from './industry-report';
import { LeadFunnelReportView } from './lead-funnel-report';
import { SalesPerformanceReportView } from './sales-performance-report';
import { ThemeUsageReportView } from './theme-usage-report';
import { UserActivityReportView } from './user-activity-report';
import { WebsiteGenerationReportView } from './website-generation-report';

// Analytics Reports (F12): one dispatcher per real `reportType`, reused by
// both the general Reports page and the dedicated Business/Usage/System/
// Cost/Audit/User Activity pages, so each report's real rendering logic
// lives in exactly one place. `envelope.data` is `unknown` on the wire
// (each of the fifteen report types has its own shape); this is the one
// place that narrows it, keyed off the envelope's own `reportType`
// discriminant — never guessed at anywhere else in this feature.
export function ReportView({ envelope }: { envelope: AnalyticsReportEnvelope }) {
  switch (envelope.reportType) {
    case 'lead_funnel':
      return <LeadFunnelReportView data={envelope.data as LeadFunnelReport} />;
    case 'conversion_rate':
      return <ConversionRateReportView data={envelope.data as ConversionRateReport} />;
    case 'sales_performance':
      return <SalesPerformanceReportView data={envelope.data as SalesPerformanceReport} />;
    case 'ai_cost':
      return <AiCostReportView data={envelope.data as AiCostReport} />;
    case 'ai_usage':
      return <AiUsageReportView data={envelope.data as AiUsageReport} />;
    case 'deployment':
      return <DeploymentReportView data={envelope.data as DeploymentReport} />;
    case 'website_generation':
      return <WebsiteGenerationReportView data={envelope.data as WebsiteGenerationReport} />;
    case 'theme_usage':
      return <ThemeUsageReportView data={envelope.data as ThemeUsageReport} />;
    case 'business_category':
      return <BusinessCategoryReportView data={envelope.data as BusinessCategoryReport} />;
    case 'industry':
      return <IndustryReportView data={envelope.data as IndustryReport} />;
    case 'error':
      return <ErrorReportView data={envelope.data as ErrorReport} />;
    case 'health':
      return <HealthReportView data={envelope.data as HealthReport} />;
    case 'user_activity':
      return <UserActivityReportView data={envelope.data as UserActivityReport} />;
    case 'audit':
      return <AuditReportView data={envelope.data as AuditReport} />;
    case 'executive_dashboard':
      return <ExecutiveDashboardReportView data={envelope.data as DashboardWidgets} />;
  }
}
