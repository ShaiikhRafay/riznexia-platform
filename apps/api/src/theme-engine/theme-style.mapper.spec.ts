import {
  ANIMATION_LEVELS,
  CARD_STYLES,
  CTA_STYLES,
  FOOTER_STYLES,
  HERO_STYLES,
  IMAGE_STYLES,
  NAVIGATION_STYLES,
} from '@riznexia/shared-types';
import {
  toApiAnimationLevel,
  toApiCardStyle,
  toApiCtaStyle,
  toApiFooterStyle,
  toApiHeroStyle,
  toApiImageStyle,
  toApiNavigationStyle,
  toPrismaAnimationLevel,
  toPrismaCardStyle,
  toPrismaCtaStyle,
  toPrismaFooterStyle,
  toPrismaHeroStyle,
  toPrismaImageStyle,
  toPrismaNavigationStyle,
} from './theme-style.mapper';

describe('theme-style.mapper', () => {
  it('round-trips every NavigationStyle value', () => {
    for (const value of NAVIGATION_STYLES) {
      expect(toApiNavigationStyle(toPrismaNavigationStyle(value))).toBe(value);
    }
  });

  it('round-trips every HeroStyle value', () => {
    for (const value of HERO_STYLES) {
      expect(toApiHeroStyle(toPrismaHeroStyle(value))).toBe(value);
    }
  });

  it('round-trips every CtaStyle value', () => {
    for (const value of CTA_STYLES) {
      expect(toApiCtaStyle(toPrismaCtaStyle(value))).toBe(value);
    }
  });

  it('round-trips every CardStyle value', () => {
    for (const value of CARD_STYLES) {
      expect(toApiCardStyle(toPrismaCardStyle(value))).toBe(value);
    }
  });

  it('round-trips every FooterStyle value', () => {
    for (const value of FOOTER_STYLES) {
      expect(toApiFooterStyle(toPrismaFooterStyle(value))).toBe(value);
    }
  });

  it('round-trips every AnimationLevel value', () => {
    for (const value of ANIMATION_LEVELS) {
      expect(toApiAnimationLevel(toPrismaAnimationLevel(value))).toBe(value);
    }
  });

  it('round-trips every ImageStyle value', () => {
    for (const value of IMAGE_STYLES) {
      expect(toApiImageStyle(toPrismaImageStyle(value))).toBe(value);
    }
  });
});
