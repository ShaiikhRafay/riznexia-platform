import { z } from 'zod';
import { AI_PROVIDERS } from './business-analysis';

// Module M7 (DECISIONS.md D-044+). Same Prisma-uppercase / API-lowercase
// split used throughout (AnalysisStatus, PlaceSyncJobStatus).
export const THEME_CATEGORIES = [
  'restaurant',
  'salon',
  'dental',
  'law-firm',
  'gym',
  'real-estate',
  'medical',
  'corporate',
] as const;
export type ThemeCategory = (typeof THEME_CATEGORIES)[number];

export const NAVIGATION_STYLES = [
  'top-bar',
  'top-bar-sticky',
  'sidebar',
  'minimal-hamburger',
] as const;
export type NavigationStyle = (typeof NAVIGATION_STYLES)[number];

export const HERO_STYLES = [
  'full-bleed-image',
  'split-image-text',
  'video-background',
  'carousel',
  'minimal-text',
] as const;
export type HeroStyle = (typeof HERO_STYLES)[number];

export const CTA_STYLES = [
  'solid-button',
  'outline-button',
  'floating-action',
  'banner-strip',
] as const;
export type CtaStyle = (typeof CTA_STYLES)[number];

export const CARD_STYLES = [
  'elevated-shadow',
  'flat-bordered',
  'minimal-divider',
  'image-overlay',
] as const;
export type CardStyle = (typeof CARD_STYLES)[number];

export const FOOTER_STYLES = ['multi-column', 'simple-centered', 'newsletter-cta'] as const;
export type FooterStyle = (typeof FOOTER_STYLES)[number];

export const ANIMATION_LEVELS = ['none', 'subtle', 'moderate', 'expressive'] as const;
export type AnimationLevel = (typeof ANIMATION_LEVELS)[number];

export const IMAGE_STYLES = [
  'photography-realistic',
  'illustration',
  'icon-driven',
  'minimal-graphic',
] as const;
export type ImageStyle = (typeof IMAGE_STYLES)[number];

export const MOBILE_NAVIGATION_PATTERNS = ['hamburger', 'bottom-tab', 'top-tab'] as const;
export type MobileNavigationPattern = (typeof MOBILE_NAVIGATION_PATTERNS)[number];

export const CONTRAST_LEVELS = ['AA', 'AAA'] as const;
export type ContrastLevel = (typeof CONTRAST_LEVELS)[number];

export const accessibilityProfileSchema = z.object({
  contrastLevel: z.enum(CONTRAST_LEVELS),
  minTouchTargetPx: z.number().int().positive(),
  reducedMotionSupport: z.boolean(),
  altTextRequired: z.boolean(),
});
export type AccessibilityProfile = z.infer<typeof accessibilityProfileSchema>;

export const mobilePreferencesSchema = z.object({
  navigationPattern: z.enum(MOBILE_NAVIGATION_PATTERNS),
  stackedLayout: z.boolean(),
  tapTargetSizePx: z.number().int().positive(),
});
export type MobilePreferences = z.infer<typeof mobilePreferencesSchema>;

// Module M7 (founder's explicit ranking requirement) — one entry per
// theme that cleared the minimum compatibility score, sorted descending.
// rankedThemes[0] is the same theme as the parent ThemeConfiguration's own
// top-level themeId/themeName/themeVersion/compatibilityScore fields
// (denormalized there for query convenience); the rest are the stored
// alternatives for a future manual-override feature.
export const rankedThemeEntrySchema = z.object({
  rank: z.number().int().positive(),
  themeId: z.enum(THEME_CATEGORIES),
  themeName: z.string(),
  themeVersion: z.string(),
  themeHash: z.string(),
  compatibilityScore: z.number().min(0).max(100),
});
export type RankedThemeEntry = z.infer<typeof rankedThemeEntrySchema>;

// The brand-identity fields carried through from BusinessAnalysis.brandBrief
// verbatim (founder's D-045 rule: "themes adapt to the brand, the brand
// never adapts to the theme") — same ColorPalette/TypographyRecommendation
// shapes as business-analysis.ts, duplicated here rather than imported to
// keep this module's public contract self-contained and independently
// versionable from M6's.
export const themeColorPaletteSchema = z.object({
  primary: z.string().min(1),
  secondary: z.string().min(1),
  accent: z.string().min(1),
  background: z.string().min(1),
  text: z.string().min(1),
});

export const themeTypographySchema = z.object({
  heading: z.string().min(1),
  body: z.string().min(1),
  accent: z.string().min(1),
});

export const themeConfigurationSchema = z.object({
  id: z.string().uuid(),
  businessId: z.string().uuid(),
  businessAnalysisId: z.string().uuid(),
  configVersion: z.number().int().positive(),

  themeId: z.enum(THEME_CATEGORIES),
  themeName: z.string(),
  themeVersion: z.string(),
  themeHash: z.string(),
  selectedAt: z.string(),
  selectedByEngineVersion: z.string(),
  compatibilityScore: z.number().min(0).max(100),

  // Brand identity — carried through from M6, never regenerated.
  industry: z.string(),
  layoutStyle: z.string(),
  colorPalette: themeColorPaletteSchema,
  typography: themeTypographySchema,

  // Theme-owned structural output.
  componentSet: z.array(z.string()),
  navigationStyle: z.enum(NAVIGATION_STYLES),
  heroStyle: z.enum(HERO_STYLES),
  ctaStyle: z.enum(CTA_STYLES),
  cardStyle: z.enum(CARD_STYLES),
  footerStyle: z.enum(FOOTER_STYLES),
  animationLevel: z.enum(ANIMATION_LEVELS),
  imageStyle: z.enum(IMAGE_STYLES),
  sectionOrder: z.array(z.string()),
  accessibilityProfile: accessibilityProfileSchema,
  mobilePreferences: mobilePreferencesSchema,

  // Module M8.1 (DECISIONS.md D-049) — explicit componentSet-to-sectionOrder
  // binding, copied verbatim from the selected theme's own
  // sectionComponentMap (packages/themes). Keys are a subset of
  // sectionOrder; every componentSet entry appears in exactly one section's
  // array.
  sectionComponentMap: z.record(z.string(), z.array(z.string())),

  rankedThemes: z.array(rankedThemeEntrySchema),

  // CostService integration for the "AI recommends" step (D-046, D-048).
  // Nullable — the AI recommendation is best-effort; these stay null when
  // it was skipped (monthly ceiling reached) or failed (provider/transient
  // error), same convention as BusinessAnalysis's own provider/model/
  // token/cost fields.
  aiRecommendationProvider: z.enum(AI_PROVIDERS).nullable(),
  aiRecommendationModel: z.string().nullable(),
  aiRecommendationPromptTokens: z.number().int().nonnegative().nullable(),
  aiRecommendationCompletionTokens: z.number().int().nonnegative().nullable(),
  aiRecommendationTotalTokens: z.number().int().nonnegative().nullable(),
  aiRecommendationCostUsd: z.number().nonnegative().nullable(),
  aiRecommendationExecutionTimeMs: z.number().int().nonnegative().nullable(),

  createdAt: z.string(),
});
export type ThemeConfiguration = z.infer<typeof themeConfigurationSchema>;
