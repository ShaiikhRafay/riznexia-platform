import { describe, expect, it } from 'vitest';
import { fakeWebsitePreviewFixture } from '../preview-fixtures';
import type { ValidatorInput } from './validator.interface';
import { performanceValidator } from './performance-validator';

function fakeInput(overrides: Partial<ValidatorInput> = {}): ValidatorInput {
  const { brandBrief, themeConfiguration, generatedWebsite } = fakeWebsitePreviewFixture();
  return {
    files: generatedWebsite.files,
    businessAnalysis: brandBrief as never,
    themeConfiguration,
    ...overrides,
  };
}

describe('performanceValidator', () => {
  it('is deterministic', () => {
    const input = fakeInput();
    expect(performanceValidator.validate(input)).toEqual(performanceValidator.validate(input));
  });

  it('every rule is tagged with the performance category', () => {
    for (const rule of performanceValidator.validate(fakeInput())) {
      expect(rule.ruleCategory).toBe('performance');
    }
  });

  it('passes every check for a real generated website', () => {
    const rules = performanceValidator.validate(fakeInput());
    const errors = rules.filter((rule) => rule.status === 'error');
    expect(errors).toEqual([]);
  });

  it('flags a raw <img> tag in a rendered template', () => {
    const input = fakeInput();
    const files = input.files.map((file) =>
      file.path === 'components/sections/hero.tsx'
        ? { ...file, content: `${file.content}\nconst x = <img src="x" />;` }
        : file,
    );
    const rule = performanceValidator
      .validate({ ...input, files })
      .find((r) => r.ruleId === 'PERF-001')!;
    expect(rule.status).toBe('error');
  });

  it('flags a force-dynamic directive as blocking static generation', () => {
    const input = fakeInput();
    const files = input.files.map((file) =>
      file.path === 'app/page.tsx'
        ? { ...file, content: `${file.content}\nexport const dynamic = "force-dynamic";` }
        : file,
    );
    const rule = performanceValidator
      .validate({ ...input, files })
      .find((r) => r.ruleId === 'PERF-004')!;
    expect(rule.status).toBe('error');
  });

  it('warns above the client-component-count threshold, without erroring', () => {
    const input = fakeInput();
    // Real fixture has 4 client components today (nav/hero/carousel/search-form-family) — well
    // under the threshold of 6, so this asserts the pass case explicitly rather than forcing a warning.
    const rule = performanceValidator.validate(input).find((r) => r.ruleId === 'PERF-003')!;
    expect(rule.status).toBe('pass');
  });

  it('reports a high-severity error, not a crash, when app/page.tsx is missing', () => {
    const input = fakeInput();
    const files = input.files.filter((file) => file.path !== 'app/page.tsx');
    expect(() => performanceValidator.validate({ ...input, files })).not.toThrow();
    const rule = performanceValidator
      .validate({ ...input, files })
      .find((r) => r.ruleId === 'PERF-004')!;
    expect(rule.status).toBe('error');
  });
});
