import { describe, expect, it } from 'vitest';
import { analyticsProviderNameSchema } from './analytics-provider';

describe('analyticsProviderNameSchema', () => {
  it('accepts self_hosted', () => {
    expect(analyticsProviderNameSchema.safeParse('self_hosted').success).toBe(true);
  });

  it('accepts every reserved provider name', () => {
    for (const name of [
      'posthog',
      'google_analytics',
      'mixpanel',
      'azure_application_insights',
      'datadog',
    ]) {
      expect(analyticsProviderNameSchema.safeParse(name).success).toBe(true);
    }
  });

  it('rejects an unknown provider', () => {
    expect(analyticsProviderNameSchema.safeParse('amplitude').success).toBe(false);
  });
});
