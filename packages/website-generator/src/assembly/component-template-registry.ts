import type { SupportedComponentType } from '@riznexia/shared-types';

export interface ComponentTemplateEntry {
  /** Exported function component name in the static template file. */
  componentName: string;
  /** Exported props interface name in the same file. */
  propsTypeName: string;
  /** Import path, resolvable via the generated project's own "@/*" alias from both app/ and lib/. */
  importPath: string;
}

// One real, static template component per SupportedComponentType (Module
// M8.4) — the fixed mapping the assembler's page/site-data generators use
// to know which component + props-interface + import path a given
// ComponentDefinition.componentType renders as. Never generated/modified;
// see packages/website-generator/templates/nextjs-base/components/sections.
export const COMPONENT_TEMPLATE_REGISTRY: Record<SupportedComponentType, ComponentTemplateEntry> = {
  navigation: {
    componentName: 'Navigation',
    propsTypeName: 'NavigationProps',
    importPath: '@/components/sections/navigation',
  },
  section: {
    componentName: 'SectionWrapper',
    propsTypeName: 'SectionWrapperProps',
    importPath: '@/components/sections/section-wrapper',
  },
  sidebar: {
    componentName: 'Sidebar',
    propsTypeName: 'SidebarProps',
    importPath: '@/components/sections/sidebar',
  },
  hero: {
    componentName: 'Hero',
    propsTypeName: 'HeroProps',
    importPath: '@/components/sections/hero',
  },
  'card-grid': {
    componentName: 'CardGrid',
    propsTypeName: 'CardGridProps',
    importPath: '@/components/sections/card-grid',
  },
  'profile-grid': {
    componentName: 'ProfileGrid',
    propsTypeName: 'ProfileGridProps',
    importPath: '@/components/sections/profile-grid',
  },
  carousel: {
    componentName: 'Carousel',
    propsTypeName: 'CarouselProps',
    importPath: '@/components/sections/carousel',
  },
  'cta-banner': {
    componentName: 'CtaBanner',
    propsTypeName: 'CtaBannerProps',
    importPath: '@/components/sections/cta-banner',
  },
  'logo-strip': {
    componentName: 'LogoStrip',
    propsTypeName: 'LogoStripProps',
    importPath: '@/components/sections/logo-strip',
  },
  'info-panel': {
    componentName: 'InfoPanel',
    propsTypeName: 'InfoPanelProps',
    importPath: '@/components/sections/info-panel',
  },
  accordion: {
    componentName: 'AccordionSection',
    propsTypeName: 'AccordionSectionProps',
    importPath: '@/components/sections/accordion-section',
  },
  'schedule-table': {
    componentName: 'ScheduleTable',
    propsTypeName: 'ScheduleTableProps',
    importPath: '@/components/sections/schedule-table',
  },
  'pricing-table': {
    componentName: 'PricingTable',
    propsTypeName: 'PricingTableProps',
    importPath: '@/components/sections/pricing-table',
  },
  'search-form': {
    componentName: 'SearchForm',
    propsTypeName: 'SearchFormProps',
    importPath: '@/components/sections/search-form',
  },
  'map-embed': {
    componentName: 'MapEmbed',
    propsTypeName: 'MapEmbedProps',
    importPath: '@/components/sections/map-embed',
  },
  'menu-list': {
    componentName: 'MenuList',
    propsTypeName: 'MenuListProps',
    importPath: '@/components/sections/menu-list',
  },
};

// Not a SupportedComponentType — the dedicated component substituted for
// the one 'section' ComponentDefinition whose sectionId is 'footer'
// (every M7 theme's sectionOrder ends there, mapped to zero
// componentPlaceholders — Module M8.1/M8.2).
export const FOOTER_TEMPLATE: ComponentTemplateEntry = {
  componentName: 'Footer',
  propsTypeName: 'FooterProps',
  importPath: '@/components/sections/footer',
};
