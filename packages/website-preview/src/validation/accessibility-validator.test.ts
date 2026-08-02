import { describe, expect, it } from 'vitest';
import { fakeWebsitePreviewFixture } from '../preview-fixtures';
import type { ValidatorInput } from './validator.interface';
import { accessibilityValidator } from './accessibility-validator';

function fakeInput(overrides: Partial<ValidatorInput> = {}): ValidatorInput {
  const { brandBrief, themeConfiguration, generatedWebsite } = fakeWebsitePreviewFixture();
  return {
    files: generatedWebsite.files,
    businessAnalysis: brandBrief as never,
    themeConfiguration,
    ...overrides,
  };
}

describe('accessibilityValidator', () => {
  it('is deterministic', () => {
    const input = fakeInput();
    expect(accessibilityValidator.validate(input)).toEqual(accessibilityValidator.validate(input));
  });

  it('every rule is tagged with the accessibility category', () => {
    for (const rule of accessibilityValidator.validate(fakeInput())) {
      expect(rule.ruleCategory).toBe('accessibility');
    }
  });

  it('passes every check for a real generated website', () => {
    const rules = accessibilityValidator.validate(fakeInput());
    const errors = rules.filter((rule) => rule.status === 'error');
    expect(errors).toEqual([]);
  });

  it('computes a real, non-trivial contrast ratio from the theme colors', () => {
    const rule = accessibilityValidator.validate(fakeInput()).find((r) => r.ruleId === 'A11Y-007')!;
    expect(rule.status).toBe('pass');
    expect(rule.message).toMatch(/Contrast ratio \d+\.\d+:1/);
  });

  it('flags a genuinely low-contrast text/background pair', () => {
    const input = fakeInput();
    const files = input.files.map((file) =>
      file.path === 'app/theme-tokens.css'
        ? {
            ...file,
            content: file.content.replace('--color-text: #2F1B0C;', '--color-text: #FFFDF9;'),
          }
        : file,
    );
    const rule = accessibilityValidator
      .validate({ ...input, files })
      .find((r) => r.ruleId === 'A11Y-007')!;
    expect(rule.status).toBe('error');
  });

  it('flags a missing skip-link', () => {
    const input = fakeInput();
    const files = input.files.map((file) =>
      file.path === 'app/layout.tsx'
        ? { ...file, content: file.content.replace('skip-link', 'nope') }
        : file,
    );
    const rule = accessibilityValidator
      .validate({ ...input, files })
      .find((r) => r.ruleId === 'A11Y-001')!;
    expect(rule.status).toBe('error');
  });

  it('flags a missing main landmark', () => {
    const input = fakeInput();
    const files = input.files.map((file) =>
      file.path === 'app/page.tsx'
        ? { ...file, content: file.content.replace('"main-content"', '"nope"') }
        : file,
    );
    const rule = accessibilityValidator
      .validate({ ...input, files })
      .find((r) => r.ruleId === 'A11Y-002')!;
    expect(rule.status).toBe('error');
  });

  it('flags a below-minimum touch target size', () => {
    const input = fakeInput();
    const files = input.files.map((file) =>
      file.path === 'app/theme-tokens.css'
        ? {
            ...file,
            content: file.content.replace('--min-touch-target: 44px;', '--min-touch-target: 24px;'),
          }
        : file,
    );
    const rule = accessibilityValidator
      .validate({ ...input, files })
      .find((r) => r.ruleId === 'A11Y-009')!;
    expect(rule.status).toBe('error');
  });

  it('reports critical errors, not a crash, when app/page.tsx and app/layout.tsx are missing', () => {
    const input = fakeInput();
    const files = input.files.filter(
      (file) => file.path !== 'app/page.tsx' && file.path !== 'app/layout.tsx',
    );
    expect(() => accessibilityValidator.validate({ ...input, files })).not.toThrow();
    const rules = accessibilityValidator.validate({ ...input, files });
    expect(rules.find((r) => r.ruleId === 'A11Y-001')!.status).toBe('error');
    expect(rules.find((r) => r.ruleId === 'A11Y-002')!.status).toBe('error');
  });
});
