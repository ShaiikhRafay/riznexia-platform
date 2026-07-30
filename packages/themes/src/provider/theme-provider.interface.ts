import type {
  AccessibilityProfile,
  AnimationLevel,
  CardStyle,
  CtaStyle,
  FooterStyle,
  HeroStyle,
  ImageStyle,
  MobilePreferences,
  NavigationStyle,
  ThemeCategory,
} from '@riznexia/shared-types';

// Module M7 (DECISIONS.md D-044) — the Theme Engine's pluggability
// abstraction, mirroring M5's LocationProvider / M6's AiTextProvider:
// business logic (apps/api/src/theme-engine/) depends only on this
// interface via the THEME_PROVIDER DI token, never on a concrete theme
// (RestaurantTheme, SalonTheme, ...) directly. Unlike LocationProvider —
// where exactly one implementation is active at a time — every registered
// theme is simultaneously available; ThemeProvider is registry-shaped,
// not swap-shaped.
export const THEME_PROVIDER = Symbol('THEME_PROVIDER');

// Purely structural/presentational content — never brand-identity fields
// (those belong to BusinessAnalysis.brandBrief and are never duplicated
// into a theme's own definition, D-045).
export interface ThemeDefinitionContent {
  /** Which BusinessAnalysis industry/category signals this theme is a candidate for. */
  industryCategories: string[];
  /** Free-text descriptive tags scored against BusinessAnalysis.brandBrief.layoutStyle (fuzzy keyword match, no AI). */
  layoutKeywords: string[];
  componentSet: string[];
  navigationStyle: NavigationStyle;
  heroStyle: HeroStyle;
  ctaStyle: CtaStyle;
  cardStyle: CardStyle;
  footerStyle: FooterStyle;
  animationLevel: AnimationLevel;
  imageStyle: ImageStyle;
  sectionOrder: string[];
  accessibilityProfile: AccessibilityProfile;
  mobilePreferences: MobilePreferences;
  /**
   * Module M8.1 (DECISIONS.md D-049) — which `componentSet` entries render
   * within each `sectionOrder` entry. Keys are a subset of `sectionOrder`;
   * every `componentSet` entry must appear in exactly one section's array
   * (enforced by `static-theme-registry.test.ts`). Added because the Layout
   * Generator (`packages/website-generator`) needs a deterministic
   * component-to-section binding, and `componentSet`/`sectionOrder` were
   * two independent flat lists with no explicit link between them.
   */
  sectionComponentMap: Record<string, string[]>;
}

// A theme's full identity — metadata (your explicit versioning
// requirement: name/version/hash/createdAt/updatedAt) plus its content.
export interface ThemeDefinition {
  id: ThemeCategory;
  name: string;
  version: string;
  hash: string;
  createdAt: string;
  updatedAt: string;
  content: ThemeDefinitionContent;
}

export interface ThemeProvider {
  getTheme(themeId: string): ThemeDefinition | undefined;
  listThemes(): ThemeDefinition[];
}
