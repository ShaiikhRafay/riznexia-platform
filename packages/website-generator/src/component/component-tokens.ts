import type { CardStyle, ThemeConfiguration, ThemeTokens } from '@riznexia/shared-types';

// Module M8.2 (DECISIONS.md D-055+) — Theme Tokens (founder's explicit
// requirement). `radius`/`spacing` are fixed universal scales, not
// theme-derived — same "fixed constant, not derived from either input"
// technique as M8.1's `BREAKPOINTS` (D-051). `shadow` is the one token
// whose *resolved value* is theme-derived (via cardStyle); everything
// else under `radius`/`spacing` stays fixed, and only which rung a given
// component defaults to (computed by `defaultRadiusToken()` below) is
// theme-derived.
const RADIUS_SCALE = { small: '4px', medium: '8px', large: '16px', full: '9999px' } as const;
const SPACING_SCALE = { xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '32px' } as const;

const CARD_STYLE_TO_SHADOW: Record<CardStyle, ThemeTokens['shadow']> = {
  'elevated-shadow': 'pronounced',
  'flat-bordered': 'none',
  'minimal-divider': 'none',
  'image-overlay': 'subtle',
};

const CARD_STYLE_TO_RADIUS_RUNG: Record<CardStyle, keyof typeof RADIUS_SCALE> = {
  'elevated-shadow': 'medium',
  'flat-bordered': 'small',
  'minimal-divider': 'small',
  'image-overlay': 'large',
};

/**
 * Pure and deterministic — every field is either a verbatim pass-through
 * of ThemeConfiguration (colors, fonts, button/card/animation style) or a
 * fixed-table lookup off `cardStyle` (shadow). Computed once per manifest;
 * every ComponentDefinition references these values by path string
 * (e.g. "token.primary"), never by copying the resolved value.
 */
export function computeThemeTokens(themeConfiguration: ThemeConfiguration): ThemeTokens {
  return {
    primary: themeConfiguration.colorPalette.primary,
    secondary: themeConfiguration.colorPalette.secondary,
    accent: themeConfiguration.colorPalette.accent,
    background: themeConfiguration.colorPalette.background,
    text: themeConfiguration.colorPalette.text,
    heading: themeConfiguration.typography.heading,
    body: themeConfiguration.typography.body,
    radius: { ...RADIUS_SCALE },
    spacing: { ...SPACING_SCALE },
    shadow: CARD_STYLE_TO_SHADOW[themeConfiguration.cardStyle],
    button: themeConfiguration.ctaStyle,
    card: themeConfiguration.cardStyle,
    animation: themeConfiguration.animationLevel,
  };
}

/** The token reference path (e.g. "token.radius.medium") a component of this cardStyle defaults to. */
export function defaultRadiusToken(cardStyle: CardStyle): string {
  return `token.radius.${CARD_STYLE_TO_RADIUS_RUNG[cardStyle]}`;
}
