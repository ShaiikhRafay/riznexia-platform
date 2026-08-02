import { describe, expect, it } from 'vitest';
import { fakeWebsitePreviewFixture } from '../preview-fixtures';
import type { ValidatorInput } from './validator.interface';
import { structuralValidator } from './structural-validator';

function fakeInput(overrides: Partial<ValidatorInput> = {}): ValidatorInput {
  const { brandBrief, themeConfiguration, generatedWebsite } = fakeWebsitePreviewFixture();
  return {
    files: generatedWebsite.files,
    businessAnalysis: brandBrief as never,
    themeConfiguration,
    ...overrides,
  };
}

describe('structuralValidator', () => {
  it('is deterministic', () => {
    const input = fakeInput();
    expect(structuralValidator.validate(input)).toEqual(structuralValidator.validate(input));
  });

  it('every rule is tagged with the structural category', () => {
    for (const rule of structuralValidator.validate(fakeInput())) {
      expect(rule.ruleCategory).toBe('structural');
    }
  });

  it('passes every required-file rule for a real generated website', () => {
    const rules = structuralValidator.validate(fakeInput());
    const fileRules = rules.filter((rule) => rule.ruleId.match(/^STRUCT-00[1-8]$/));
    expect(fileRules).toHaveLength(8);
    expect(fileRules.every((rule) => rule.status === 'pass')).toBe(true);
  });

  it('flags a missing required file as an error', () => {
    const input = fakeInput();
    const files = input.files.filter((file) => file.path !== 'app/sitemap.ts');
    const rules = structuralValidator.validate({ ...input, files });
    const rule = rules.find((r) => r.ruleId === 'STRUCT-006')!;
    expect(rule.status).toBe('error');
    expect(rule.severity).toBe('critical');
  });

  it('passes when every internal link target resolves (real fixture has real CTA/nav targets)', () => {
    const rule = structuralValidator.validate(fakeInput()).find((r) => r.ruleId === 'STRUCT-009')!;
    expect(rule.status).toBe('pass');
    expect(rule.message).toMatch(/^\d+ internal link target/);
  });

  it('flags a broken internal link target (targetComponentId lives in lib/site-data.ts, not page.tsx)', () => {
    const input = fakeInput();
    const files = input.files.map((file) =>
      file.path === 'lib/site-data.ts'
        ? {
            ...file,
            content: file.content.replace('"section-contact"', '"section-does-not-exist"'),
          }
        : file,
    );
    const rule = structuralValidator
      .validate({ ...input, files })
      .find((r) => r.ruleId === 'STRUCT-009')!;
    expect(rule.status).toBe('error');
    expect(rule.message).toContain('section-does-not-exist');
  });

  it('flags an empty image reference', () => {
    const input = fakeInput();
    const files = input.files.map((file) =>
      file.path === 'lib/site-data.ts'
        ? { ...file, content: file.content.replace('"photo-ref-1"', '""') }
        : file,
    );
    const rule = structuralValidator
      .validate({ ...input, files })
      .find((r) => r.ruleId === 'STRUCT-010')!;
    expect(rule.status).toBe('error');
  });

  it('reports a critical error, not a crash, when app/page.tsx itself is missing', () => {
    const input = fakeInput();
    const files = input.files.filter((file) => file.path !== 'app/page.tsx');
    expect(() => structuralValidator.validate({ ...input, files })).not.toThrow();
    expect(
      structuralValidator.validate({ ...input, files }).find((r) => r.ruleId === 'STRUCT-001')!
        .status,
    ).toBe('error');
  });

  it('reports errors, not a crash, when lib/site-data.ts itself is missing', () => {
    const input = fakeInput();
    const files = input.files.filter((file) => file.path !== 'lib/site-data.ts');
    const rules = structuralValidator.validate({ ...input, files });
    expect(rules.find((r) => r.ruleId === 'STRUCT-003')!.status).toBe('error');
    expect(rules.find((r) => r.ruleId === 'STRUCT-009')!.status).toBe('error');
    expect(rules.find((r) => r.ruleId === 'STRUCT-010')!.status).toBe('error');
  });
});
