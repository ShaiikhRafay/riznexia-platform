import { describe, expect, it } from 'vitest';
import type { RuleCategory, RuleStatus, ValidationRuleResult } from '@riznexia/shared-types';
import { fakeWebsitePreviewFixture } from '../preview-fixtures';
import { runAllValidators } from '../validation/validator-registry';
import { aggregateReadiness } from './publish-readiness-engine';

function rule(category: RuleCategory, status: RuleStatus, id = 'X-001'): ValidationRuleResult {
  return {
    ruleId: id,
    ruleCategory: category,
    ruleName: 'Test rule',
    severity: 'medium',
    status,
    message: 'test',
    recommendation: status === 'pass' ? null : 'fix it',
    documentationUrl: null,
  };
}

describe('aggregateReadiness', () => {
  it('is a pure fold — the same rules always produce the same scores', () => {
    const rules = [rule('seo', 'pass'), rule('seo', 'error')];
    expect(aggregateReadiness(rules)).toEqual(aggregateReadiness(rules));
  });

  it('scores a category 100 with no deductions when every rule passes', () => {
    const readiness = aggregateReadiness([rule('seo', 'pass'), rule('seo', 'pass')]);
    expect(readiness.seoScore).toEqual({ score: 100, maxScore: 100, deductions: [] });
  });

  it('scores a category 100 with no deductions when it has zero rules', () => {
    const readiness = aggregateReadiness([rule('seo', 'pass')]);
    expect(readiness.accessibilityScore).toEqual({ score: 100, maxScore: 100, deductions: [] });
  });

  it('an error costs a rule its full equal share of 100 points', () => {
    // 2 rules in the category => each worth 50 points; 1 error => -50.
    const readiness = aggregateReadiness([
      rule('performance', 'pass'),
      rule('performance', 'error', 'PERF-002'),
    ]);
    expect(readiness.performanceScore.score).toBe(50);
    expect(readiness.performanceScore.deductions).toEqual([
      { ruleId: 'PERF-002', ruleName: 'Test rule', pointsDeducted: 50, reason: 'test' },
    ]);
  });

  it('a warning costs a rule half its equal share', () => {
    const readiness = aggregateReadiness([
      rule('accessibility', 'pass'),
      rule('accessibility', 'warning', 'A11Y-010'),
    ]);
    expect(readiness.accessibilityScore.score).toBe(75);
    expect(readiness.accessibilityScore.deductions[0]?.pointsDeducted).toBe(25);
  });

  it('every score explains itself with a deduction whenever it is below 100 (founder requirement)', () => {
    const readiness = aggregateReadiness([rule('content', 'error', 'CONTENT-001')]);
    expect(readiness.contentCompletenessScore.score).toBe(0);
    expect(readiness.contentCompletenessScore.deductions).toHaveLength(1);
    expect(readiness.contentCompletenessScore.deductions[0]?.reason).toBe('test');
  });

  it('never scores below 0 or above 100', () => {
    const readiness = aggregateReadiness([
      rule('structural', 'error'),
      rule('structural', 'error'),
      rule('structural', 'error'),
    ]);
    expect(readiness.structuralIntegrityScore.score).toBeGreaterThanOrEqual(0);
    expect(readiness.structuralIntegrityScore.score).toBeLessThanOrEqual(100);
  });

  it('computes the overall score as the fixed-weight average of the five category scores', () => {
    const rules = [
      ...Array.from({ length: 1 }, () => rule('seo', 'pass' as const)),
      ...Array.from({ length: 1 }, () => rule('accessibility', 'pass' as const)),
      ...Array.from({ length: 1 }, () => rule('performance', 'pass' as const)),
      ...Array.from({ length: 1 }, () => rule('content', 'pass' as const)),
      rule('structural', 'error'), // structural: 1 rule, error => score 0
    ];
    const readiness = aggregateReadiness(rules);
    // weights: seo .20 + a11y .25 + perf .15 + content .20 + structural .20 = 1.00
    // score = 100*.20 + 100*.25 + 100*.15 + 100*.20 + 0*.20 = 80
    expect(readiness.overallPublishScore.score).toBe(80);
    expect(readiness.overallPublishScore.deductions).toEqual([
      {
        ruleId: 'OVERALL-STRUCTURAL',
        ruleName: 'Structural Integrity category score',
        pointsDeducted: 20,
        reason: 'Structural Integrity scored 0/100, weighted at 20% of the overall score',
      },
    ]);
  });

  it('unregistered/future rule categories (e.g. a future SecurityValidator) do not crash aggregation', () => {
    const rules: ValidationRuleResult[] = [
      rule('seo', 'pass'),
      { ...rule('seo', 'pass'), ruleCategory: 'seo' },
    ];
    expect(() => aggregateReadiness(rules)).not.toThrow();
  });

  it('produces a fully-explained readiness report for the real generated website fixture', () => {
    const { brandBrief, themeConfiguration, generatedWebsite } = fakeWebsitePreviewFixture();
    const rules = runAllValidators({
      files: generatedWebsite.files,
      businessAnalysis: brandBrief as never,
      themeConfiguration,
    });
    const readiness = aggregateReadiness(rules);

    for (const score of [
      readiness.seoScore,
      readiness.accessibilityScore,
      readiness.performanceScore,
      readiness.contentCompletenessScore,
      readiness.structuralIntegrityScore,
      readiness.overallPublishScore,
    ]) {
      expect(score.score).toBeGreaterThanOrEqual(0);
      expect(score.score).toBeLessThanOrEqual(100);
      expect(score.maxScore).toBe(100);
      if (score.score < 100) {
        expect(score.deductions.length).toBeGreaterThan(0);
      }
    }
  });
});
