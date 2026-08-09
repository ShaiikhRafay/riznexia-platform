import { z } from 'zod';

// Module M12 (DECISIONS.md D-105) — the Analytics Provider abstraction's
// closed set of pluggable event-tracking targets. Only `self_hosted` has a
// concrete provider implementation this phase; the rest are reserved
// values with no adapter behind them yet, the same closed-enum-reservation
// discipline as `DeploymentProviderName` (D-093).
export const ANALYTICS_PROVIDER_NAMES = [
  'self_hosted',
  'posthog',
  'google_analytics',
  'mixpanel',
  'azure_application_insights',
  'datadog',
] as const;
export type AnalyticsProviderName = (typeof ANALYTICS_PROVIDER_NAMES)[number];

export const analyticsProviderNameSchema = z.enum(ANALYTICS_PROVIDER_NAMES);
