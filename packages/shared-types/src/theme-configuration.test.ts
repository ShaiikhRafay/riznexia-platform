import { describe, expect, it } from 'vitest';
import {
  accessibilityProfileSchema,
  mobilePreferencesSchema,
  rankedThemeEntrySchema,
  themeConfigurationSchema,
} from './theme-configuration';

const UUID_A = '11111111-1111-4111-8111-111111111111';
const UUID_B = '22222222-2222-4222-8222-222222222222';

function validRankedEntry(overrides: Record<string, unknown> = {}) {
  return {
    rank: 1,
    themeId: 'restaurant',
    themeName: 'Restaurant',
    themeVersion: 'v1.0',
    themeHash: 'abc123',
    compatibilityScore: 92,
    ...overrides,
  };
}

function validConfig(overrides: Record<string, unknown> = {}) {
  return {
    id: UUID_A,
    businessId: UUID_B,
    businessAnalysisId: UUID_A,
    configVersion: 1,
    themeId: 'restaurant',
    themeName: 'Restaurant',
    themeVersion: 'v1.0',
    themeHash: 'abc123',
    selectedAt: new Date().toISOString(),
    selectedByEngineVersion: 'v1.0',
    compatibilityScore: 92,
    industry: 'Italian Restaurant',
    layoutStyle: 'Warm and inviting, image-forward',
    colorPalette: {
      primary: '#8B4513',
      secondary: '#F5DEB3',
      accent: '#FF6347',
      background: '#FFF8DC',
      text: '#2F1B0C',
    },
    typography: { heading: 'Georgia', body: 'Helvetica', accent: 'Pacifico' },
    componentSet: ['hero-banner', 'menu-showcase'],
    navigationStyle: 'top-bar-sticky',
    heroStyle: 'full-bleed-image',
    ctaStyle: 'solid-button',
    cardStyle: 'image-overlay',
    footerStyle: 'multi-column',
    animationLevel: 'moderate',
    imageStyle: 'photography-realistic',
    sectionOrder: ['hero', 'about', 'menu', 'footer'],
    accessibilityProfile: {
      contrastLevel: 'AA',
      minTouchTargetPx: 44,
      reducedMotionSupport: true,
      altTextRequired: true,
    },
    mobilePreferences: { navigationPattern: 'hamburger', stackedLayout: true, tapTargetSizePx: 48 },
    sectionComponentMap: { hero: ['hero-banner'], about: [], menu: ['menu-showcase'], footer: [] },
    rankedThemes: [validRankedEntry()],
    aiRecommendationProvider: 'claude',
    aiRecommendationModel: 'claude-sonnet-5',
    aiRecommendationPromptTokens: 100,
    aiRecommendationCompletionTokens: 50,
    aiRecommendationTotalTokens: 150,
    aiRecommendationCostUsd: 0.0018,
    aiRecommendationExecutionTimeMs: 850,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('accessibilityProfileSchema', () => {
  it('accepts a well-formed profile', () => {
    expect(
      accessibilityProfileSchema.safeParse({
        contrastLevel: 'AA',
        minTouchTargetPx: 44,
        reducedMotionSupport: true,
        altTextRequired: true,
      }).success,
    ).toBe(true);
  });

  it('rejects a contrastLevel outside AA/AAA', () => {
    expect(
      accessibilityProfileSchema.safeParse({
        contrastLevel: 'A',
        minTouchTargetPx: 44,
        reducedMotionSupport: true,
        altTextRequired: true,
      }).success,
    ).toBe(false);
  });
});

describe('mobilePreferencesSchema', () => {
  it('rejects a non-positive tapTargetSizePx', () => {
    expect(
      mobilePreferencesSchema.safeParse({
        navigationPattern: 'hamburger',
        stackedLayout: true,
        tapTargetSizePx: 0,
      }).success,
    ).toBe(false);
  });
});

describe('rankedThemeEntrySchema', () => {
  it('accepts a well-formed entry', () => {
    expect(rankedThemeEntrySchema.safeParse(validRankedEntry()).success).toBe(true);
  });

  it('rejects a themeId outside the registered category enum', () => {
    expect(
      rankedThemeEntrySchema.safeParse(validRankedEntry({ themeId: 'auto-body-shop' })).success,
    ).toBe(false);
  });

  it('rejects a compatibilityScore outside [0, 100]', () => {
    expect(
      rankedThemeEntrySchema.safeParse(validRankedEntry({ compatibilityScore: 150 })).success,
    ).toBe(false);
  });
});

describe('themeConfigurationSchema', () => {
  it('accepts a well-formed configuration', () => {
    expect(themeConfigurationSchema.safeParse(validConfig()).success).toBe(true);
  });

  it('rejects a navigationStyle outside the documented enum', () => {
    expect(
      themeConfigurationSchema.safeParse(validConfig({ navigationStyle: 'mega-menu' })).success,
    ).toBe(false);
  });

  it('rejects an empty rankedThemes array shape mismatch (wrong entry type)', () => {
    expect(
      themeConfigurationSchema.safeParse(validConfig({ rankedThemes: [{ themeId: 'restaurant' }] }))
        .success,
    ).toBe(false);
  });

  it('accepts an empty rankedThemes array (structurally valid, even though the service never produces one)', () => {
    expect(themeConfigurationSchema.safeParse(validConfig({ rankedThemes: [] })).success).toBe(
      true,
    );
  });

  it('rejects a missing brand-identity field', () => {
    const { industry: _omit, ...rest } = validConfig();
    expect(themeConfigurationSchema.safeParse(rest).success).toBe(false);
  });

  it('accepts null AI-recommendation fields (AI step skipped or failed)', () => {
    expect(
      themeConfigurationSchema.safeParse(
        validConfig({
          aiRecommendationProvider: null,
          aiRecommendationModel: null,
          aiRecommendationPromptTokens: null,
          aiRecommendationCompletionTokens: null,
          aiRecommendationTotalTokens: null,
          aiRecommendationCostUsd: null,
          aiRecommendationExecutionTimeMs: null,
        }),
      ).success,
    ).toBe(true);
  });

  it('rejects a missing (as opposed to null) AI-recommendation field', () => {
    const { aiRecommendationCostUsd: _omit, ...rest } = validConfig();
    expect(themeConfigurationSchema.safeParse(rest).success).toBe(false);
  });
});
