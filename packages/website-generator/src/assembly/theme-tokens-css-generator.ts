import type { ThemeConfiguration, ThemeTokens } from '@riznexia/shared-types';

// Fixed CSS shadow values per ThemeTokens.shadow enum rung — same "fixed
// lookup table, not derived" discipline as every other constant table in
// this pipeline (RADIUS_SCALE/SPACING_SCALE in component-tokens.ts).
const SHADOW_VALUES: Record<ThemeTokens['shadow'], string> = {
  none: 'none',
  subtle: '0 1px 3px rgba(0, 0, 0, 0.08)',
  moderate: '0 4px 12px rgba(0, 0, 0, 0.12)',
  pronounced: '0 12px 32px rgba(0, 0, 0, 0.18)',
};

// A real hover elevation change (not just a static shadow) — one rung up
// the same fixed scale above, deterministic per theme's own shadow rung.
// 'pronounced' is already the top rung, so it stays put on hover.
const SHADOW_HOVER_RUNG: Record<ThemeTokens['shadow'], ThemeTokens['shadow']> = {
  none: 'subtle',
  subtle: 'moderate',
  moderate: 'pronounced',
  pronounced: 'pronounced',
};

/**
 * Serializes ThemeTokens (Module M8.2) + AccessibilityProfile
 * (ThemeConfiguration) into `app/theme-tokens.css`'s `:root { ... }`
 * block — these exact custom-property names are already referenced
 * throughout the static template's tailwind.config.ts and every section
 * component, so this is the one place their values are ever assigned.
 * `--color-border` has no direct ThemeTokens field (M8.2 never modeled
 * one); it derives from `secondary`, the same color the static
 * `border-secondary`-adjacent UI already leans on for dividers.
 */
export function generateThemeTokensCss(
  themeTokens: ThemeTokens,
  accessibilityProfile: ThemeConfiguration['accessibilityProfile'],
): string {
  const lines = [
    ':root {',
    `  --color-primary: ${themeTokens.primary};`,
    `  --color-secondary: ${themeTokens.secondary};`,
    `  --color-accent: ${themeTokens.accent};`,
    `  --color-background: ${themeTokens.background};`,
    `  --color-text: ${themeTokens.text};`,
    `  --color-border: ${themeTokens.secondary};`,
    // Real hover feedback (color-mix darkens toward black in-browser —
    // no HSL/hex parsing needed here, works for any input color format
    // ThemeConfiguration.colorPalette may supply). Widely supported in
    // every browser this Next.js/React 19 baseline already targets.
    `  --color-primary-hover: color-mix(in srgb, ${themeTokens.primary} 85%, black);`,
    `  --color-accent-hover: color-mix(in srgb, ${themeTokens.accent} 85%, black);`,
    `  --font-heading: ${themeTokens.heading};`,
    `  --font-body: ${themeTokens.body};`,
    `  --radius-small: ${themeTokens.radius.small};`,
    `  --radius-medium: ${themeTokens.radius.medium};`,
    `  --radius-large: ${themeTokens.radius.large};`,
    `  --radius-full: ${themeTokens.radius.full};`,
    `  --spacing-xs: ${themeTokens.spacing.xs};`,
    `  --spacing-sm: ${themeTokens.spacing.sm};`,
    `  --spacing-md: ${themeTokens.spacing.md};`,
    `  --spacing-lg: ${themeTokens.spacing.lg};`,
    `  --spacing-xl: ${themeTokens.spacing.xl};`,
    `  --shadow-value: ${SHADOW_VALUES[themeTokens.shadow]};`,
    `  --shadow-hover-value: ${SHADOW_VALUES[SHADOW_HOVER_RUNG[themeTokens.shadow]]};`,
    `  --min-touch-target: ${accessibilityProfile.minTouchTargetPx}px;`,
    '}',
    '',
  ];
  return lines.join('\n');
}
