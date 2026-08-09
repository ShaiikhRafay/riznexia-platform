import { Module } from '@nestjs/common';
import { AzureApplicationInsightsProvider } from './azure-application-insights.provider';
import { ANALYTICS_PROVIDER } from './analytics-provider.interface';
import { DatadogProvider } from './datadog.provider';
import { GoogleAnalyticsProvider } from './google-analytics.provider';
import { MixpanelProvider } from './mixpanel.provider';
import { PostHogProvider } from './posthog.provider';
import { SelfHostedAnalyticsProvider } from './self-hosted-analytics.provider';

// Module M12 — the DI wiring point for the Analytics Provider
// abstraction, the exact structural mirror of M11's ProviderModule.
// Every other analytics/* module imports this rather than each
// registering its own ANALYTICS_PROVIDER binding, so there is exactly one
// place that decides which concrete provider is active. Swapping in a
// future real PostHogProvider/GoogleAnalyticsProvider/MixpanelProvider/
// AzureApplicationInsightsProvider/DatadogProvider means changing the
// `useClass` line below — no consumer of ANALYTICS_PROVIDER changes.
@Module({
  providers: [
    SelfHostedAnalyticsProvider,
    PostHogProvider,
    GoogleAnalyticsProvider,
    MixpanelProvider,
    AzureApplicationInsightsProvider,
    DatadogProvider,
    { provide: ANALYTICS_PROVIDER, useClass: SelfHostedAnalyticsProvider },
  ],
  exports: [ANALYTICS_PROVIDER],
})
export class ProviderModule {}
