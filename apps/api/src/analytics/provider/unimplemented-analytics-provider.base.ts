import type { AnalyticsProviderName } from '@riznexia/shared-types';
import type { AnalyticsProvider, AnalyticsTrackInput } from './analytics-provider.interface';

// Module M12 (DECISIONS.md D-105) — founder's explicit Decision 3: create
// provider interfaces for PostHog/Google Analytics/Mixpanel/Azure
// Application Insights/Datadog without building their integrations this
// phase. Each concrete subclass genuinely implements `AnalyticsProvider`
// (a one-line `ProviderModule.useClass` swap away from being the active
// provider — no business-logic change required) but its methods throw
// until a real adapter backs it, the same reserved-not-built stance as
// `UnimplementedDeploymentProvider` (M11).
export abstract class UnimplementedAnalyticsProvider implements AnalyticsProvider {
  abstract readonly name: AnalyticsProviderName;
  readonly version = 'unimplemented';

  isConfigured(): boolean {
    return false;
  }

  track(_input: AnalyticsTrackInput): Promise<void> {
    return Promise.reject(
      new Error(
        `The "${this.name}" analytics provider is reserved for a future module — no adapter is implemented yet.`,
      ),
    );
  }
}
