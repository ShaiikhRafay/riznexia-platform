import { z } from 'zod';
import {
  CTA_STYLES,
  FOOTER_STYLES,
  HERO_STYLES,
  MOBILE_NAVIGATION_PATTERNS,
  NAVIGATION_STYLES,
} from './theme-configuration';

// Module M8.1 (DECISIONS.md D-050+) — Layout Generator output. Deterministic:
// generateLayout() (packages/website-generator) always produces the same
// LayoutConfiguration for the same BusinessAnalysis + ThemeConfiguration
// pair — every field below is a fixed lookup or arithmetic derivation, no
// AI call, no randomness. "style"/pass-through fields (navigation.style,
// hero.style, footer.style, ctaPlacements[].style) are copied verbatim from
// ThemeConfiguration, same brand/theme-identity-lock discipline as D-045 —
// this module derives concrete structural parameters from a style the
// theme already chose, it never picks a different style.

export const LAYOUT_TYPES = ['full-width', 'grid', 'contained'] as const;
export type LayoutType = (typeof LAYOUT_TYPES)[number];

export const MEDIA_POSITIONS = ['background', 'left', 'right', 'none'] as const;
export type MediaPosition = (typeof MEDIA_POSITIONS)[number];

export const CONTENT_ALIGNMENTS = ['left', 'center'] as const;
export type ContentAlignment = (typeof CONTENT_ALIGNMENTS)[number];

export const GAP_SIZES = ['compact', 'standard', 'spacious'] as const;
export type GapSize = (typeof GAP_SIZES)[number];

export const SECTION_RESPONSIVE_RULES = ['stack', 'reflow'] as const;
export type SectionResponsiveRule = (typeof SECTION_RESPONSIVE_RULES)[number];

export const CTA_ZONES = ['hero', 'sticky-header', 'section-end', 'footer'] as const;
export type CtaZone = (typeof CTA_ZONES)[number];

export const SIDEBAR_POSITIONS = ['left', 'right'] as const;
export type SidebarPosition = (typeof SIDEBAR_POSITIONS)[number];

export const SIDEBAR_WIDTHS = ['narrow', 'standard'] as const;
export type SidebarWidth = (typeof SIDEBAR_WIDTHS)[number];

export const NAVIGATION_POSITIONS = ['top', 'side'] as const;
export type NavigationPosition = (typeof NAVIGATION_POSITIONS)[number];

// One entry per ThemeConfiguration.sectionOrder entry, order preserved —
// section order in `pageStructure` IS the page's section order. Carries no
// display copy/labels (content generation is M8.3, out of scope here).
export const pageSectionLayoutSchema = z.object({
  sectionId: z.string().min(1),
  order: z.number().int().positive(),
  layoutType: z.enum(LAYOUT_TYPES),
});
export type PageSectionLayout = z.infer<typeof pageSectionLayoutSchema>;

export const navigationLayoutSchema = z.object({
  style: z.enum(NAVIGATION_STYLES),
  position: z.enum(NAVIGATION_POSITIONS),
  sticky: z.boolean(),
  items: z.array(z.string()),
  mobileBehavior: z.enum(MOBILE_NAVIGATION_PATTERNS),
});
export type NavigationLayout = z.infer<typeof navigationLayoutSchema>;

export const heroLayoutSchema = z.object({
  style: z.enum(HERO_STYLES),
  mediaPosition: z.enum(MEDIA_POSITIONS),
  contentAlignment: z.enum(CONTENT_ALIGNMENTS),
  ctaSlots: z.number().int().positive(),
});
export type HeroLayout = z.infer<typeof heroLayoutSchema>;

export const footerLayoutSchema = z.object({
  style: z.enum(FOOTER_STYLES),
  columns: z.number().int().positive(),
  includesNewsletter: z.boolean(),
  includesSocialLinks: z.boolean(),
});
export type FooterLayout = z.infer<typeof footerLayoutSchema>;

// Populated only when the source ThemeConfiguration's navigationStyle is
// 'sidebar' — null otherwise.
export const sidebarLayoutSchema = z.object({
  position: z.enum(SIDEBAR_POSITIONS),
  width: z.enum(SIDEBAR_WIDTHS),
  sticky: z.boolean(),
});
export type SidebarLayout = z.infer<typeof sidebarLayoutSchema>;

export const gridDefinitionSchema = z.object({
  sectionId: z.string().min(1),
  columns: z.object({
    mobile: z.number().int().positive(),
    tablet: z.number().int().positive(),
    desktop: z.number().int().positive(),
  }),
  gap: z.enum(GAP_SIZES),
});
export type GridDefinition = z.infer<typeof gridDefinitionSchema>;

export const responsiveRuleSetSchema = z.object({
  breakpoints: z.object({
    mobile: z.number().int().nonnegative(),
    tablet: z.number().int().positive(),
    desktop: z.number().int().positive(),
    wide: z.number().int().positive(),
  }),
  stackedLayout: z.boolean(),
  tapTargetSizePx: z.number().int().positive(),
  perSection: z.record(z.string(), z.enum(SECTION_RESPONSIVE_RULES)),
});
export type ResponsiveRuleSet = z.infer<typeof responsiveRuleSetSchema>;

export const ctaPlacementSchema = z.object({
  ctaText: z.string().min(1),
  zone: z.enum(CTA_ZONES),
  style: z.enum(CTA_STYLES),
});
export type CtaPlacement = z.infer<typeof ctaPlacementSchema>;

// Named slots only — componentId/sectionId identify *where* a theme
// component belongs; deciding what actually renders there is M8.2
// (Component Generator), not this module's job.
export const componentPlaceholderSchema = z.object({
  componentId: z.string().min(1),
  sectionId: z.string().min(1),
  order: z.number().int().nonnegative(),
});
export type ComponentPlaceholder = z.infer<typeof componentPlaceholderSchema>;

export const layoutConfigurationSchema = z.object({
  id: z.string().uuid(),
  businessId: z.string().uuid(),
  businessAnalysisId: z.string().uuid(),
  themeConfigurationId: z.string().uuid(),
  configVersion: z.number().int().positive(),
  layoutEngineVersion: z.string().min(1),

  pageStructure: z.array(pageSectionLayoutSchema),
  navigation: navigationLayoutSchema,
  hero: heroLayoutSchema,
  footer: footerLayoutSchema,
  sidebar: sidebarLayoutSchema.nullable(),
  grid: z.array(gridDefinitionSchema),
  responsiveRules: responsiveRuleSetSchema,
  ctaPlacements: z.array(ctaPlacementSchema),
  componentPlaceholders: z.array(componentPlaceholderSchema),

  createdAt: z.string(),
});
export type LayoutConfiguration = z.infer<typeof layoutConfigurationSchema>;
