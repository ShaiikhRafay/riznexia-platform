import type { AnalyticsProviderName } from '@riznexia/shared-types';

// Module M12 (DECISIONS.md D-105) — the provider-agnostic contract every
// analytics/event-tracking target implements, the exact structural mirror
// of DeploymentProvider (M11, D-093) and LocationProvider (M5, D-033).
// Business logic (AnalyticsEngineService and everything built on top of
// it) depends only on this interface, injected behind the
// ANALYTICS_PROVIDER token — never on a concrete class like
// SelfHostedAnalyticsProvider. A future PostHogProvider/
// GoogleAnalyticsProvider/MixpanelProvider/AzureApplicationInsightsProvider/
// DatadogProvider implements the same shape; swapping the active one
// means changing ProviderModule's `useClass` line, nothing else.
//
// This is deliberately a *separate* concern from the Reporting Engine's
// own reads of M1-M11's tables (founder's Decision 2) — `track()` only
// ever captures new, raw platform telemetry (`AnalyticsEvent`, D-106),
// never a vendor call for computing a report.

export const ANALYTICS_PROVIDER = Symbol('ANALYTICS_PROVIDER');

export interface AnalyticsTrackInput {
  eventType: string;
  entityType?: string;
  entityId?: string;
  actorId?: string | null;
  metadata?: Record<string, unknown>;
  /** Defaults to "now" when omitted. */
  occurredAt?: Date;
}

export interface AnalyticsProvider {
  readonly name: AnalyticsProviderName;
  readonly version: string;
  /** Synchronous, no network call — just "do I have credentials/storage configured". */
  isConfigured(): boolean;
  track(input: AnalyticsTrackInput): Promise<void>;
}
