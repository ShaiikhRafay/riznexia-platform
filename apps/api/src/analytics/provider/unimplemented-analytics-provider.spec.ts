import { AzureApplicationInsightsProvider } from './azure-application-insights.provider';
import type { AnalyticsProvider } from './analytics-provider.interface';
import { DatadogProvider } from './datadog.provider';
import { GoogleAnalyticsProvider } from './google-analytics.provider';
import { MixpanelProvider } from './mixpanel.provider';
import { PostHogProvider } from './posthog.provider';

// Founder's explicit Decision 3 — each of these genuinely implements
// AnalyticsProvider (provably pluggable via ProviderModule's useClass)
// but has no real adapter behind it yet.
describe.each([
  ['posthog', () => new PostHogProvider()],
  ['google_analytics', () => new GoogleAnalyticsProvider()],
  ['mixpanel', () => new MixpanelProvider()],
  ['azure_application_insights', () => new AzureApplicationInsightsProvider()],
  ['datadog', () => new DatadogProvider()],
])('%s provider (reserved, unimplemented)', (expectedName, factory) => {
  let provider: AnalyticsProvider;

  beforeEach(() => {
    provider = factory();
  });

  it(`exposes name "${expectedName}"`, () => {
    expect(provider.name).toBe(expectedName);
  });

  it('reports isConfigured() as false', () => {
    expect(provider.isConfigured()).toBe(false);
  });

  it('rejects track() with a clear "reserved" error', async () => {
    await expect(provider.track({ eventType: 'x' })).rejects.toThrow(
      /reserved for a future module/,
    );
  });
});
