import { describe, expect, it } from 'vitest';
import { StaticThemeRegistry } from '../provider/static-theme-registry';
import {
  MINIMUM_COMPATIBILITY_SCORE,
  rankThemes,
  scoreThemeCompatibility,
  type CompatibilityScoringInput,
} from './compatibility-scorer';

const registry = new StaticThemeRegistry();

function restaurantInput(
  overrides: Partial<CompatibilityScoringInput> = {},
): CompatibilityScoringInput {
  return {
    industry: 'Italian Restaurant',
    businessCategory: 'restaurant',
    layoutStyle: 'Warm and inviting, image-forward',
    websiteSections: ['Hero', 'Menu', 'Gallery', 'Contact'],
    ...overrides,
  };
}

describe('scoreThemeCompatibility', () => {
  it('scores a direct industry match near the top of the range', () => {
    const theme = registry.getTheme('restaurant')!;
    const breakdown = scoreThemeCompatibility(theme, restaurantInput());
    expect(breakdown.industryScore).toBe(100);
    expect(breakdown.compositeScore).toBeGreaterThan(80);
  });

  it('scores a mismatched industry (law firm signals vs. Restaurant theme) low on industry, high on generic checks', () => {
    const theme = registry.getTheme('restaurant')!;
    const breakdown = scoreThemeCompatibility(
      theme,
      restaurantInput({
        industry: 'Personal Injury Law Firm',
        businessCategory: 'law firm',
        layoutStyle: 'Authoritative and formal',
        websiteSections: ['Practice Areas', 'Attorney Bios'],
      }),
    );
    expect(breakdown.industryScore).toBeLessThan(30);
  });

  it('Corporate always carries a non-zero industry floor, even for an unmatched industry', () => {
    const corporate = registry.getTheme('corporate')!;
    const breakdown = scoreThemeCompatibility(
      corporate,
      restaurantInput({
        industry: 'Underwater Basket Weaving Supply',
        businessCategory: 'novelty',
      }),
    );
    expect(breakdown.industryScore).toBeGreaterThanOrEqual(40);
  });

  it('blends in an AI recommendation as a boost without exceeding 90 on industry alone', () => {
    const dental = registry.getTheme('dental')!;
    const breakdown = scoreThemeCompatibility(
      dental,
      restaurantInput({
        industry: 'Ambiguous Health Services',
        businessCategory: 'health',
        aiRecommendedThemeId: 'dental',
        aiRecommendationConfidence: 1,
      }),
    );
    expect(breakdown.industryScore).toBeLessThanOrEqual(90);
    expect(breakdown.industryScore).toBeGreaterThan(0);
  });

  it('scores full websiteSections coverage as 100 on componentAvailability', () => {
    const theme = registry.getTheme('restaurant')!;
    const breakdown = scoreThemeCompatibility(
      theme,
      restaurantInput({ websiteSections: ['Menu', 'Gallery'] }),
    );
    expect(breakdown.componentAvailabilityScore).toBe(100);
  });

  it('scores partial websiteSections coverage proportionally', () => {
    const theme = registry.getTheme('restaurant')!;
    const breakdown = scoreThemeCompatibility(
      theme,
      restaurantInput({ websiteSections: ['Menu', 'Completely Unrelated Section Xyz'] }),
    );
    expect(breakdown.componentAvailabilityScore).toBe(50);
  });

  it('every check contributes to a composite in [0, 100]', () => {
    for (const theme of registry.listThemes()) {
      const breakdown = scoreThemeCompatibility(theme, restaurantInput());
      expect(breakdown.compositeScore).toBeGreaterThanOrEqual(0);
      expect(breakdown.compositeScore).toBeLessThanOrEqual(100);
    }
  });
});

describe('rankThemes', () => {
  it('ranks themes descending by compositeScore', () => {
    const ranked = rankThemes(registry.listThemes(), restaurantInput());
    for (let i = 1; i < ranked.length; i += 1) {
      expect(ranked[i - 1]!.breakdown.compositeScore).toBeGreaterThanOrEqual(
        ranked[i]!.breakdown.compositeScore,
      );
    }
  });

  it('places the Restaurant theme first for a clear restaurant business', () => {
    const ranked = rankThemes(registry.listThemes(), restaurantInput());
    expect(ranked[0]!.theme.id).toBe('restaurant');
  });

  it('filters out themes below MINIMUM_COMPATIBILITY_SCORE', () => {
    const ranked = rankThemes(registry.listThemes(), restaurantInput());
    for (const entry of ranked) {
      expect(entry.breakdown.compositeScore).toBeGreaterThanOrEqual(MINIMUM_COMPATIBILITY_SCORE);
    }
  });

  it('returns an empty ranking only in a genuinely pathological case (never forces a bad fit)', () => {
    // Even wildly mismatched input still clears the bar via Corporate's
    // floor + accessibility/mobile baselines in practice — this test
    // documents that behavior rather than asserting emptiness, since the
    // real "no compatible theme" case is exercised at the service layer
    // with a stubbed scorer (business-analysis-runner style isolation).
    const ranked = rankThemes(
      registry.listThemes(),
      restaurantInput({ industry: '', businessCategory: '', layoutStyle: '', websiteSections: [] }),
    );
    expect(ranked.some((entry) => entry.theme.id === 'corporate')).toBe(true);
  });
});
