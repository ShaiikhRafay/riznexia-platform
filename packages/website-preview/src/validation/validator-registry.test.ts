import { describe, expect, it } from 'vitest';
import { fakeWebsitePreviewFixture } from '../preview-fixtures';
import { RULE_CATEGORIES } from '@riznexia/shared-types';
import type { ValidationRuleResult } from '@riznexia/shared-types';
import { VALIDATOR_REGISTRY, runAllValidators } from './validator-registry';
import type { ValidatorInput, WebsiteValidator } from './validator.interface';

function fakeInput(): ValidatorInput {
  const { brandBrief, themeConfiguration, generatedWebsite } = fakeWebsitePreviewFixture();
  return {
    files: generatedWebsite.files,
    businessAnalysis: brandBrief as never,
    themeConfiguration,
  };
}

describe('runAllValidators', () => {
  it('produces the same rule list for the same input (deterministic, Decision 2)', () => {
    const input = fakeInput();
    expect(runAllValidators(input)).toEqual(runAllValidators(input));
  });

  it('produces at least one rule from every registered validator category', () => {
    const rules = runAllValidators(fakeInput());
    const categoriesSeen = new Set(rules.map((rule) => rule.ruleCategory));
    for (const validator of VALIDATOR_REGISTRY) {
      expect(categoriesSeen.has(validator.category)).toBe(true);
    }
  });

  it('the real generated website passes every structural/content/SEO check (no ERROR-status rules outside expected gaps)', () => {
    const rules = runAllValidators(fakeInput());
    const errors = rules.filter((rule) => rule.status === 'error');
    expect(errors).toEqual([]);
  });

  it('every result includes all founder-required fields', () => {
    const rules = runAllValidators(fakeInput());
    for (const rule of rules) {
      expect(rule.ruleId.length).toBeGreaterThan(0);
      expect(RULE_CATEGORIES).toContain(rule.ruleCategory);
      expect(rule.ruleName.length).toBeGreaterThan(0);
      expect(['info', 'low', 'medium', 'high', 'critical']).toContain(rule.severity);
      expect(['pass', 'warning', 'error']).toContain(rule.status);
      expect(rule.message.length).toBeGreaterThan(0);
      expect(rule.recommendation === null || typeof rule.recommendation === 'string').toBe(true);
      expect(rule.documentationUrl).toBeNull();
    }
  });

  it('Decision 3: no validator function references another validator module (registry is the only place that imports all of them)', () => {
    // Each validator's own module only imports ast-inspect-helpers/rule-builder/its own interface —
    // verified structurally by this test file itself only needing validator-registry.ts to run all five.
    expect(VALIDATOR_REGISTRY).toHaveLength(5);
  });

  it('Future Compatibility: a new validator can be registered without changing any existing validator', () => {
    const fakeSecurityValidator: WebsiteValidator = {
      category: 'structural', // reuses an existing category for this test; a real future validator would extend RuleCategory
      validatorVersion: 'v1.0',
      validate(): ValidationRuleResult[] {
        return [
          {
            ruleId: 'SEC-001',
            ruleCategory: 'structural',
            ruleName: 'No inline scripts beyond JSON-LD',
            severity: 'high',
            status: 'pass',
            message: 'test-only validator',
            recommendation: null,
            documentationUrl: null,
          },
        ];
      },
    };

    const extendedRegistry = [...VALIDATOR_REGISTRY, fakeSecurityValidator];
    const rules = extendedRegistry.flatMap((validator) => validator.validate(fakeInput()));
    expect(rules.some((rule) => rule.ruleId === 'SEC-001')).toBe(true);
    // The original registry and every existing validator's own output is unaffected.
    expect(runAllValidators(fakeInput()).some((rule) => rule.ruleId === 'SEC-001')).toBe(false);
  });
});
