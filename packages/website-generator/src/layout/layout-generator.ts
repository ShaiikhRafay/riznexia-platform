import type {
  AnimationLevel,
  BusinessAnalysisOutput,
  ComponentPlaceholder,
  ContentAlignment,
  CtaPlacement,
  CtaStyle,
  CtaZone,
  FooterLayout,
  FooterStyle,
  GapSize,
  GridDefinition,
  HeroLayout,
  HeroStyle,
  MediaPosition,
  NavigationLayout,
  PageSectionLayout,
  ResponsiveRuleSet,
  SectionResponsiveRule,
  SidebarLayout,
  ThemeConfiguration,
} from '@riznexia/shared-types';

// Module M8.1 (DECISIONS.md D-050+) — versions this module's derivation
// rules (the lookup tables/arithmetic below), distinct from themeVersion/
// selectedByEngineVersion, which version its two inputs.
export const LAYOUT_ENGINE_VERSION = 'v1.0';

// Fixed breakpoint set — a module constant, not derived from either input,
// so it never varies (part of the "no randomness" determinism contract).
const BREAKPOINTS = { mobile: 0, tablet: 768, desktop: 1024, wide: 1440 } as const;

const HERO_MEDIA_POSITION: Record<HeroStyle, MediaPosition> = {
  'full-bleed-image': 'background',
  'split-image-text': 'right',
  'video-background': 'background',
  carousel: 'background',
  'minimal-text': 'none',
};

const HERO_CONTENT_ALIGNMENT: Record<HeroStyle, ContentAlignment> = {
  'full-bleed-image': 'center',
  'split-image-text': 'left',
  'video-background': 'center',
  carousel: 'center',
  'minimal-text': 'center',
};

const FOOTER_COLUMNS: Record<FooterStyle, number> = {
  'multi-column': 4,
  'simple-centered': 1,
  'newsletter-cta': 2,
};

const ANIMATION_TO_GAP: Record<AnimationLevel, GapSize> = {
  none: 'compact',
  subtle: 'compact',
  moderate: 'standard',
  expressive: 'spacious',
};

const MAX_HERO_CTA_SLOTS = 2;
const MAX_CTA_PLACEMENTS = 3;
const GRID_COLUMNS = { mobile: 1, tablet: 2, desktop: 3 } as const;

// The persisted row's own fields (id/businessId/businessAnalysisId/
// themeConfigurationId/configVersion/createdAt) are assembled by the
// caller (apps/api) at persistence time — this is exactly the content a
// fresh generation run produces.
export interface LayoutConfigurationContent {
  layoutEngineVersion: string;
  pageStructure: PageSectionLayout[];
  navigation: NavigationLayout;
  hero: HeroLayout;
  footer: FooterLayout;
  sidebar: SidebarLayout | null;
  grid: GridDefinition[];
  responsiveRules: ResponsiveRuleSet;
  ctaPlacements: CtaPlacement[];
  componentPlaceholders: ComponentPlaceholder[];
}

/**
 * Pure and deterministic: the same (brandBrief, themeConfiguration) pair
 * always produces a structurally identical LayoutConfigurationContent — no
 * AI call, no Date.now()/Math.random(), no I/O. Every derived value comes
 * from a fixed lookup table above or arithmetic over the two inputs.
 *
 * Generates layout STRUCTURE only — no HTML, no React, no display copy
 * (nav items / component placeholders carry theme-authored ids, not
 * labels), no images. That is M8.2 (Component Generator) and M8.3
 * (Content Binding)'s job, not this module's.
 */
export function generateLayout(
  brandBrief: BusinessAnalysisOutput,
  themeConfiguration: ThemeConfiguration,
): LayoutConfigurationContent {
  const { sectionOrder, sectionComponentMap } = themeConfiguration;
  const heroSectionId = sectionOrder[0];

  // A section renders as a "grid" of its mapped component(s) when it has
  // at least one — except the hero, which is always a singular full-width
  // block regardless of whether it has a mapped component.
  const gridSectionIds = sectionOrder.filter(
    (sectionId) => sectionId !== heroSectionId && (sectionComponentMap[sectionId]?.length ?? 0) > 0,
  );
  const gridSectionIdSet = new Set(gridSectionIds);

  const pageStructure: PageSectionLayout[] = sectionOrder.map((sectionId, index) => ({
    sectionId,
    order: index + 1,
    layoutType:
      sectionId === heroSectionId
        ? 'full-width'
        : gridSectionIdSet.has(sectionId)
          ? 'grid'
          : 'contained',
  }));

  const navigation: NavigationLayout = {
    style: themeConfiguration.navigationStyle,
    position: themeConfiguration.navigationStyle === 'sidebar' ? 'side' : 'top',
    sticky: themeConfiguration.navigationStyle === 'top-bar-sticky',
    // Every section between hero (first) and footer (last) — every
    // registered theme's sectionOrder starts with a hero-like section and
    // ends with a footer-like one (structural, not string-matched).
    items: sectionOrder.slice(1, -1),
    mobileBehavior: themeConfiguration.mobilePreferences.navigationPattern,
  };

  const hero: HeroLayout = {
    style: themeConfiguration.heroStyle,
    mediaPosition: HERO_MEDIA_POSITION[themeConfiguration.heroStyle],
    contentAlignment: HERO_CONTENT_ALIGNMENT[themeConfiguration.heroStyle],
    ctaSlots: Math.min(brandBrief.ctaRecommendations.length, MAX_HERO_CTA_SLOTS),
  };

  const footer: FooterLayout = {
    style: themeConfiguration.footerStyle,
    columns: FOOTER_COLUMNS[themeConfiguration.footerStyle],
    includesNewsletter: themeConfiguration.footerStyle === 'newsletter-cta',
    includesSocialLinks: brandBrief.socialProofSuggestions.length > 0,
  };

  const sidebar: SidebarLayout | null =
    themeConfiguration.navigationStyle === 'sidebar'
      ? { position: 'left', width: 'standard', sticky: true }
      : null;

  const gap = ANIMATION_TO_GAP[themeConfiguration.animationLevel];
  const grid: GridDefinition[] = gridSectionIds.map((sectionId) => ({
    sectionId,
    columns: { ...GRID_COLUMNS },
    gap,
  }));

  const perSection: Record<string, SectionResponsiveRule> = {};
  for (const sectionId of sectionOrder) {
    perSection[sectionId] =
      gridSectionIdSet.has(sectionId) && themeConfiguration.mobilePreferences.stackedLayout
        ? 'stack'
        : 'reflow';
  }

  const responsiveRules: ResponsiveRuleSet = {
    breakpoints: { ...BREAKPOINTS },
    stackedLayout: themeConfiguration.mobilePreferences.stackedLayout,
    tapTargetSizePx: themeConfiguration.mobilePreferences.tapTargetSizePx,
    perSection,
  };

  const ctaPlacements: CtaPlacement[] = brandBrief.ctaRecommendations
    .slice(0, MAX_CTA_PLACEMENTS)
    .map((ctaText, index) => ({
      ctaText,
      zone: ctaZoneForIndex(index, themeConfiguration.ctaStyle),
      style: themeConfiguration.ctaStyle,
    }));

  const componentPlaceholders: ComponentPlaceholder[] = sectionOrder.flatMap((sectionId) =>
    (sectionComponentMap[sectionId] ?? []).map((componentId, order) => ({
      componentId,
      sectionId,
      order,
    })),
  );

  return {
    layoutEngineVersion: LAYOUT_ENGINE_VERSION,
    pageStructure,
    navigation,
    hero,
    footer,
    sidebar,
    grid,
    responsiveRules,
    ctaPlacements,
    componentPlaceholders,
  };
}

function ctaZoneForIndex(index: number, ctaStyle: CtaStyle): CtaZone {
  if (index === 0) return 'hero';
  if (index === 1) return ctaStyle === 'floating-action' ? 'sticky-header' : 'section-end';
  return 'footer';
}
