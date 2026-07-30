import { describe, expect, it } from 'vitest';
import { ResponseValidator } from './response-validator';

function validPayload() {
  return {
    businessSummary: 'A family-owned diner.',
    industry: 'Restaurant',
    targetAudience: ['Local families'],
    brandPersonality: ['Warm'],
    toneOfVoice: 'Friendly',
    primaryServices: ['Dine-in'],
    secondaryServices: [],
    uniqueSellingPoints: ['Family recipes since 1985'],
    colorPalette: {
      primary: '#8B4513',
      secondary: '#F5DEB3',
      accent: '#FF6347',
      background: '#FFF8DC',
      text: '#2F1B0C',
    },
    typography: { heading: 'Georgia', body: 'Helvetica', accent: 'Pacifico' },
    layoutStyle: 'Warm and inviting',
    websiteSections: ['Hero', 'Menu'],
    seoKeywords: ['diner near me'],
    localSeoSuggestions: [],
    ctaRecommendations: ['Order Online'],
    trustSignals: [],
    socialProofSuggestions: [],
    imageRecommendations: [],
    contentRecommendations: ['Highlight family history'],
    confidenceScore: 0.8,
  };
}

describe('ResponseValidator', () => {
  const validator = new ResponseValidator();

  it('accepts a well-formed JSON response and splits confidenceScore out of brandBrief', () => {
    const result = validator.validate(JSON.stringify(validPayload()));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.confidenceScore).toBe(0.8);
      expect(result.data.brandBrief).not.toHaveProperty('confidenceScore');
      expect(result.data.brandBrief.industry).toBe('Restaurant');
    }
  });

  it('strips a markdown code fence the model wrapped the JSON in', () => {
    const fenced = '```json\n' + JSON.stringify(validPayload()) + '\n```';
    const result = validator.validate(fenced);
    expect(result.ok).toBe(true);
  });

  it('returns ok:false with a parse error for non-JSON text', () => {
    const result = validator.validate('I cannot analyze this business.');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors[0]).toMatch(/not valid JSON/);
    }
  });

  it('returns ok:false with field-level errors for a missing required field', () => {
    const { industry: _omit, ...rest } = validPayload();
    const result = validator.validate(JSON.stringify(rest));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.startsWith('industry'))).toBe(true);
    }
  });

  it('returns ok:false for an out-of-range confidenceScore', () => {
    const result = validator.validate(JSON.stringify({ ...validPayload(), confidenceScore: 1.5 }));
    expect(result.ok).toBe(false);
  });

  it('never throws on malformed input', () => {
    expect(() => validator.validate('{not json')).not.toThrow();
    expect(() => validator.validate('')).not.toThrow();
    expect(() => validator.validate('null')).not.toThrow();
  });
});
