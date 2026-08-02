import { describe, expect, it } from 'vitest';
import {
  publishReadinessReportSchema,
  previewReportSchema,
  validationRuleResultSchema,
  websitePreviewSchema,
  scoreBreakdownSchema,
} from './website-preview';

const UUID_A = '11111111-1111-4111-8111-111111111111';

function baseMetadata() {
  return {
    previewVersion: 1,
    generatedWebsiteVersion: 1,
    validationVersion: 'v1.0',
    generatedByModuleVersion: 'v1.0',
    createdAt: new Date().toISOString(),
  };
}

function validRule(overrides: Record<string, unknown> = {}) {
  return {
    ruleId: 'SEO-001',
    ruleCategory: 'seo',
    ruleName: 'Meta title present',
    severity: 'high',
    status: 'pass',
    message: 'metadata.title is present',
    recommendation: null,
    documentationUrl: null,
    ...overrides,
  };
}

function validScoreBreakdown(overrides: Record<string, unknown> = {}) {
  return { score: 100, maxScore: 100, deductions: [], ...overrides };
}

describe('validationRuleResultSchema', () => {
  it('accepts a fully-populated pass rule', () => {
    expect(validationRuleResultSchema.safeParse(validRule()).success).toBe(true);
  });

  it('accepts a rule with recommendation and documentationUrl set', () => {
    expect(
      validationRuleResultSchema.safeParse(
        validRule({
          status: 'error',
          recommendation: 'Add a canonical URL',
          documentationUrl: 'https://example.com/docs/seo',
        }),
      ).success,
    ).toBe(true);
  });

  it('rejects an unknown ruleCategory', () => {
    expect(
      validationRuleResultSchema.safeParse(validRule({ ruleCategory: 'security' })).success,
    ).toBe(false);
  });

  it('rejects an unknown status', () => {
    expect(validationRuleResultSchema.safeParse(validRule({ status: 'skipped' })).success).toBe(
      false,
    );
  });

  it('rejects an unknown severity', () => {
    expect(validationRuleResultSchema.safeParse(validRule({ severity: 'urgent' })).success).toBe(
      false,
    );
  });

  it('rejects an empty message', () => {
    expect(validationRuleResultSchema.safeParse(validRule({ message: '' })).success).toBe(false);
  });
});

describe('scoreBreakdownSchema', () => {
  it('accepts a perfect score with no deductions', () => {
    expect(scoreBreakdownSchema.safeParse(validScoreBreakdown()).success).toBe(true);
  });

  it('accepts a reduced score with deductions explaining why', () => {
    expect(
      scoreBreakdownSchema.safeParse(
        validScoreBreakdown({
          score: 75,
          deductions: [
            {
              ruleId: 'SEO-004',
              ruleName: 'Canonical URL present',
              pointsDeducted: 25,
              reason: 'metadata.alternates.canonical is missing',
            },
          ],
        }),
      ).success,
    ).toBe(true);
  });

  it('rejects a score above 100', () => {
    expect(scoreBreakdownSchema.safeParse(validScoreBreakdown({ score: 101 })).success).toBe(false);
  });

  it('rejects maxScore other than 100', () => {
    expect(scoreBreakdownSchema.safeParse(validScoreBreakdown({ maxScore: 50 })).success).toBe(
      false,
    );
  });
});

describe('websitePreviewSchema', () => {
  it('accepts a fully-populated preview', () => {
    const preview = {
      id: UUID_A,
      businessId: UUID_A,
      generatedWebsiteId: UUID_A,
      businessName: "Joe's Diner",
      themeName: 'Restaurant',
      themeId: 'restaurant',
      devicePresets: [{ mode: 'desktop', widthPx: 1280 }],
      files: [{ path: 'package.json', sizeBytes: 512 }],
      ...baseMetadata(),
    };
    expect(websitePreviewSchema.safeParse(preview).success).toBe(true);
  });

  it('rejects an unknown device mode', () => {
    const preview = {
      id: UUID_A,
      businessId: UUID_A,
      generatedWebsiteId: UUID_A,
      businessName: "Joe's Diner",
      themeName: 'Restaurant',
      themeId: 'restaurant',
      devicePresets: [{ mode: 'watch', widthPx: 200 }],
      files: [],
      ...baseMetadata(),
    };
    expect(websitePreviewSchema.safeParse(preview).success).toBe(false);
  });
});

describe('previewReportSchema', () => {
  it('accepts a report with real rules', () => {
    const report = {
      id: UUID_A,
      businessId: UUID_A,
      generatedWebsiteId: UUID_A,
      rules: [validRule()],
      validationTimestamp: new Date().toISOString(),
      ...baseMetadata(),
    };
    expect(previewReportSchema.safeParse(report).success).toBe(true);
  });
});

describe('publishReadinessReportSchema', () => {
  it('accepts a fully-populated readiness report', () => {
    const report = {
      id: UUID_A,
      businessId: UUID_A,
      generatedWebsiteId: UUID_A,
      seoScore: validScoreBreakdown(),
      accessibilityScore: validScoreBreakdown(),
      performanceScore: validScoreBreakdown(),
      contentCompletenessScore: validScoreBreakdown(),
      structuralIntegrityScore: validScoreBreakdown(),
      overallPublishScore: validScoreBreakdown(),
      ...baseMetadata(),
    };
    expect(publishReadinessReportSchema.safeParse(report).success).toBe(true);
  });

  it('rejects a report missing a required score', () => {
    const report = {
      id: UUID_A,
      businessId: UUID_A,
      generatedWebsiteId: UUID_A,
      seoScore: validScoreBreakdown(),
      accessibilityScore: validScoreBreakdown(),
      performanceScore: validScoreBreakdown(),
      contentCompletenessScore: validScoreBreakdown(),
      overallPublishScore: validScoreBreakdown(),
      ...baseMetadata(),
    };
    expect(publishReadinessReportSchema.safeParse(report).success).toBe(false);
  });
});
