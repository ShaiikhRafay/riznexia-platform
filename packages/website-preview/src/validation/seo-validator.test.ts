import { describe, expect, it } from 'vitest';
import { fakeWebsitePreviewFixture } from '../preview-fixtures';
import type { ValidatorInput } from './validator.interface';
import { seoValidator } from './seo-validator';

function fakeInput(overrides: Partial<ValidatorInput> = {}): ValidatorInput {
  const { brandBrief, themeConfiguration, generatedWebsite } = fakeWebsitePreviewFixture();
  return {
    files: generatedWebsite.files,
    businessAnalysis: brandBrief as never,
    themeConfiguration,
    ...overrides,
  };
}

describe('seoValidator', () => {
  it('is deterministic', () => {
    const input = fakeInput();
    expect(seoValidator.validate(input)).toEqual(seoValidator.validate(input));
  });

  it('every rule is tagged with the seo category', () => {
    for (const rule of seoValidator.validate(fakeInput())) {
      expect(rule.ruleCategory).toBe('seo');
    }
  });

  it('produces exactly the 11 documented SEO rules', () => {
    const ruleIds = seoValidator.validate(fakeInput()).map((rule) => rule.ruleId);
    expect(ruleIds).toEqual([
      'SEO-001',
      'SEO-002',
      'SEO-003',
      'SEO-004',
      'SEO-005',
      'SEO-006',
      'SEO-007',
      'SEO-008',
      'SEO-009',
      'SEO-010',
      'SEO-011',
    ]);
  });

  it('passes title/description/keywords/canonical/OpenGraph/Twitter/JSON-LD for a real generated website', () => {
    const rules = seoValidator.validate(fakeInput());
    for (const ruleId of [
      'SEO-001',
      'SEO-002',
      'SEO-003',
      'SEO-004',
      'SEO-005',
      'SEO-006',
      'SEO-007',
      'SEO-008',
      'SEO-009',
    ]) {
      expect(rules.find((rule) => rule.ruleId === ruleId)!.status).toBe('pass');
    }
  });

  it('warns (not errors) when FAQPage schema is absent — expected when no FAQ source exists', () => {
    const rule = seoValidator.validate(fakeInput()).find((r) => r.ruleId === 'SEO-010')!;
    expect(rule.status).toBe('warning');
  });

  it('passes BreadcrumbList when real page structure exists', () => {
    const rule = seoValidator.validate(fakeInput()).find((r) => r.ruleId === 'SEO-011')!;
    expect(rule.status).toBe('pass');
  });

  it('flags a missing title as a critical error', () => {
    const input = fakeInput();
    const files = input.files.map((file) =>
      file.path === 'app/page.tsx'
        ? { ...file, content: file.content.replace(/title: "[^"]*"/, 'title: ""') }
        : file,
    );
    const rule = seoValidator.validate({ ...input, files }).find((r) => r.ruleId === 'SEO-001')!;
    expect(rule.status).toBe('error');
    expect(rule.severity).toBe('critical');
  });

  it('reports a critical error, not a crash, when app/page.tsx is missing', () => {
    const input = fakeInput();
    const files = input.files.filter((file) => file.path !== 'app/page.tsx');
    expect(() => seoValidator.validate({ ...input, files })).not.toThrow();
    const rules = seoValidator.validate({ ...input, files });
    expect(rules).toHaveLength(1);
    expect(rules[0]?.status).toBe('error');
  });
});
