import type { LayoutConfiguration as LayoutConfigurationModel } from '@riznexia/db';
import type {
  ComponentPlaceholder,
  CtaPlacement,
  FooterLayout,
  GridDefinition,
  HeroLayout,
  LayoutConfiguration as LayoutConfigurationResponse,
  NavigationLayout,
  PageSectionLayout,
  ResponsiveRuleSet,
  SidebarLayout,
} from '@riznexia/shared-types';

// Every compound field is stored as Json (schema.prisma: "the whole value
// is read together", same reasoning as ThemeConfiguration's colorPalette/
// typography) — cast straight through, no per-field Prisma<->API enum
// mapping needed (unlike theme-style.mapper.ts, which exists because
// ThemeConfiguration's structural fields are typed Postgres enum columns).
export function toLayoutConfigurationResponse(
  config: LayoutConfigurationModel,
): LayoutConfigurationResponse {
  return {
    id: config.id,
    businessId: config.businessId,
    businessAnalysisId: config.businessAnalysisId,
    themeConfigurationId: config.themeConfigurationId,
    configVersion: config.configVersion,
    layoutEngineVersion: config.layoutEngineVersion,

    pageStructure: config.pageStructure as unknown as PageSectionLayout[],
    navigation: config.navigation as unknown as NavigationLayout,
    hero: config.hero as unknown as HeroLayout,
    footer: config.footer as unknown as FooterLayout,
    sidebar: config.sidebar as unknown as SidebarLayout | null,
    grid: config.grid as unknown as GridDefinition[],
    responsiveRules: config.responsiveRules as unknown as ResponsiveRuleSet,
    ctaPlacements: config.ctaPlacements as unknown as CtaPlacement[],
    componentPlaceholders: config.componentPlaceholders as unknown as ComponentPlaceholder[],

    createdAt: config.createdAt.toISOString(),
  };
}
