import { describe, expect, it } from 'vitest';
import { fakeWebsitePreviewFixture } from '../preview-fixtures';
import type { ValidatorInput } from './validator.interface';
import { contentCompletenessValidator } from './content-completeness-validator';

function fakeInput(overrides: Partial<ValidatorInput> = {}): ValidatorInput {
  const { brandBrief, themeConfiguration, generatedWebsite } = fakeWebsitePreviewFixture();
  return {
    files: generatedWebsite.files,
    businessAnalysis: brandBrief as never,
    themeConfiguration,
    ...overrides,
  };
}

describe('contentCompletenessValidator', () => {
  it('is deterministic', () => {
    const input = fakeInput();
    expect(contentCompletenessValidator.validate(input)).toEqual(
      contentCompletenessValidator.validate(input),
    );
  });

  it('every rule is tagged with the content category and the fixed CONTENT-001 rule id', () => {
    const rules = contentCompletenessValidator.validate(fakeInput());
    expect(rules.length).toBeGreaterThan(0);
    for (const rule of rules) {
      expect(rule.ruleCategory).toBe('content');
      expect(rule.ruleId).toBe('CONTENT-001');
    }
  });

  it('passes every bound field for a real generated website', () => {
    const rules = contentCompletenessValidator.validate(fakeInput());
    expect(rules.every((rule) => rule.status === 'pass')).toBe(true);
  });

  it('every passing message includes the field path and its source', () => {
    const rules = contentCompletenessValidator.validate(fakeInput());
    for (const rule of rules) {
      expect(rule.message).toMatch(/^\w+Props\.\w+ is bound and non-empty \(source: ".+"\)$/);
    }
  });

  it('flags a bound field whose value was emptied out', () => {
    const input = fakeInput();
    const files = input.files.map((file) =>
      file.path === 'lib/site-data.ts'
        ? { ...file, content: file.content.replace('"Family recipes since 1985"', '""') }
        : file,
    );
    const rules = contentCompletenessValidator.validate({ ...input, files });
    const errors = rules.filter((rule) => rule.status === 'error');
    expect(errors).toHaveLength(1);
    expect(errors[0]?.message).toContain('empty');
  });

  it('reports a critical error, not a crash, when lib/site-data.ts is missing', () => {
    const input = fakeInput();
    const files = input.files.filter((file) => file.path !== 'lib/site-data.ts');
    expect(() => contentCompletenessValidator.validate({ ...input, files })).not.toThrow();
    const rules = contentCompletenessValidator.validate({ ...input, files });
    expect(rules).toHaveLength(1);
    expect(rules[0]?.status).toBe('error');
  });
});
