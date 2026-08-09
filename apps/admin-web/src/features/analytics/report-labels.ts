import type { ReportType } from '@riznexia/shared-types';

// Analytics Reports (F12): human-readable labels for the fifteen real,
// closed-enum `REPORT_TYPES` — verified directly against
// `packages/shared-types/src/analytics-report.ts`. The founder's brief
// named fifteen reports too, but three of those names ("Business Growth",
// "API Usage Report", "Preview Report") have no backend report type or
// data source behind them at all — building a page for any of them would
// mean inventing data, so they are not included here. See DECISIONS.md
// for this module.
export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  lead_funnel: 'Sales Funnel',
  conversion_rate: 'Conversion Report',
  sales_performance: 'Sales Performance',
  ai_cost: 'AI Cost Report',
  ai_usage: 'AI Usage Report',
  deployment: 'Deployment Report',
  website_generation: 'Website Generation Report',
  theme_usage: 'Theme Report',
  business_category: 'Category Report',
  industry: 'Industry Report',
  error: 'Error Report',
  health: 'System Health Report',
  user_activity: 'User Activity Report',
  audit: 'Audit Report',
  executive_dashboard: 'Executive Dashboard Report',
};

export const REPORT_TYPE_OPTIONS = (Object.keys(REPORT_TYPE_LABELS) as ReportType[]).map(
  (type) => ({
    value: type,
    label: REPORT_TYPE_LABELS[type],
  }),
);
