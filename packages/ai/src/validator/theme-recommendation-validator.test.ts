import { describe, expect, it } from 'vitest';
import { ThemeRecommendationValidator } from './theme-recommendation-validator';

describe('ThemeRecommendationValidator', () => {
  const validator = new ThemeRecommendationValidator();

  it('accepts a well-formed recommendation', () => {
    const result = validator.validate(
      JSON.stringify({
        themeId: 'restaurant',
        confidence: 0.9,
        reasoning: 'Menu-focused business.',
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.themeId).toBe('restaurant');
      expect(result.data.confidence).toBe(0.9);
    }
  });

  it('accepts the literal "none" as a themeId', () => {
    const result = validator.validate(
      JSON.stringify({ themeId: 'none', confidence: 0.1, reasoning: 'No clear fit.' }),
    );
    expect(result.ok).toBe(true);
  });

  it('strips a markdown code fence', () => {
    const fenced =
      '```json\n' +
      JSON.stringify({ themeId: 'dental', confidence: 0.8, reasoning: 'x' }) +
      '\n```';
    expect(validator.validate(fenced).ok).toBe(true);
  });

  it('rejects non-JSON text', () => {
    expect(validator.validate('I think this is a dental practice.').ok).toBe(false);
  });

  it('rejects a confidence outside [0, 1]', () => {
    const result = validator.validate(
      JSON.stringify({ themeId: 'gym', confidence: 1.5, reasoning: 'x' }),
    );
    expect(result.ok).toBe(false);
  });

  it('rejects a missing reasoning field', () => {
    const result = validator.validate(JSON.stringify({ themeId: 'gym', confidence: 0.5 }));
    expect(result.ok).toBe(false);
  });

  it('never throws on malformed input', () => {
    expect(() => validator.validate('{not json')).not.toThrow();
    expect(() => validator.validate('')).not.toThrow();
  });
});
