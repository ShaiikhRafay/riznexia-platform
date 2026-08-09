import { describe, expect, it } from 'vitest';
import { websiteGenerationStatusSchema } from './website-status';

const UUID_A = '11111111-1111-4111-8111-111111111111';

describe('websiteGenerationStatusSchema', () => {
  it('accepts a not-started rollup', () => {
    expect(
      websiteGenerationStatusSchema.safeParse({
        leadId: UUID_A,
        stage: 'not_started',
        hasAnalysis: false,
        hasTheme: false,
        hasLayout: false,
        hasComponents: false,
        hasContent: false,
        hasGeneratedWebsite: false,
        generatedWebsiteVersion: null,
        hasPreview: false,
        publishReadinessScore: null,
      }).success,
    ).toBe(true);
  });

  it('accepts a preview-ready rollup with a real score', () => {
    expect(
      websiteGenerationStatusSchema.safeParse({
        leadId: UUID_A,
        stage: 'preview_ready',
        hasAnalysis: true,
        hasTheme: true,
        hasLayout: true,
        hasComponents: true,
        hasContent: true,
        hasGeneratedWebsite: true,
        generatedWebsiteVersion: 2,
        hasPreview: true,
        publishReadinessScore: 88,
      }).success,
    ).toBe(true);
  });

  it('rejects an unknown stage', () => {
    expect(
      websiteGenerationStatusSchema.safeParse({
        leadId: UUID_A,
        stage: 'deployed',
        hasAnalysis: true,
        hasTheme: true,
        hasLayout: true,
        hasComponents: true,
        hasContent: true,
        hasGeneratedWebsite: true,
        generatedWebsiteVersion: 1,
        hasPreview: true,
        publishReadinessScore: 90,
      }).success,
    ).toBe(false);
  });
});
