import type {
  ComponentDefinition,
  ComponentManifest,
  ContentFieldBinding,
  ContentManifest,
  LayoutConfiguration,
} from '@riznexia/shared-types';

const SECTION_PREFIX = 'section-';

// A structural label derived purely from a technical sectionId (same
// technique as M8.1/M8.2/M8.3's titleCase()) — reused here rather than
// imported from the content package so the assembler package.json doesn't
// need a cross-phase runtime dependency for one small pure function.
function titleCase(id: string): string {
  return id
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export interface MappedComponent {
  component: ComponentDefinition;
  /** True only for the single 'section' ComponentDefinition whose sectionId is 'footer'. */
  isFooterSection: boolean;
  props: Record<string, unknown>;
}

/**
 * Merges each ComponentDefinition's bound ContentManifest fields with the
 * structural/theme-derived values (mediaPosition, ctaStyle, columns,
 * sticky, mobileBehavior, layoutType, ...) sourced from
 * LayoutConfiguration/ComponentManifest into ONE combined plain-JS props
 * object per component — so every generated JSX call site can spread a
 * single object uniformly, regardless of component type. Pure and
 * deterministic: the same four inputs always produce the same output, no
 * AI/regeneration, only assembly of already-produced data.
 */
export function mapComponentProps(
  componentManifest: ComponentManifest,
  contentManifest: ContentManifest,
  layoutConfiguration: LayoutConfiguration,
  businessName: string,
): MappedComponent[] {
  const contentByComponentId = new Map(
    contentManifest.componentContent.map((entry) => [entry.componentId, entry.fields]),
  );
  const sectionById = new Map(
    layoutConfiguration.pageStructure.map((section) => [section.sectionId, section]),
  );

  return componentManifest.components.map((component) => {
    const fields = contentByComponentId.get(component.componentId) ?? [];
    const sectionId = component.componentId.startsWith(SECTION_PREFIX)
      ? component.componentId.slice(SECTION_PREFIX.length)
      : null;
    const isFooterSection = component.componentType === 'section' && sectionId === 'footer';

    const props = isFooterSection
      ? footerProps(businessName, layoutConfiguration)
      : {
          ...contentProps(fields),
          ...structuralProps(
            component,
            sectionId,
            sectionById,
            layoutConfiguration,
            businessName,
            componentManifest.themeTokens.button,
          ),
        };

    return { component, isFooterSection, props };
  });
}

function contentProps(fields: ContentFieldBinding[]): Record<string, unknown> {
  const props: Record<string, unknown> = {};
  for (const field of fields) {
    props[field.slotName] = field.value;
  }
  return props;
}

function footerProps(
  businessName: string,
  layoutConfiguration: LayoutConfiguration,
): Record<string, unknown> {
  return { businessName, columns: layoutConfiguration.footer.columns };
}

function structuralProps(
  component: ComponentDefinition,
  sectionId: string | null,
  sectionById: Map<string, LayoutConfiguration['pageStructure'][number]>,
  layoutConfiguration: LayoutConfiguration,
  businessName: string,
  ctaStyle: string,
): Record<string, unknown> {
  switch (component.componentType) {
    case 'navigation':
      return {
        businessName,
        sticky: layoutConfiguration.navigation.sticky,
        mobileBehavior: layoutConfiguration.navigation.mobileBehavior,
      };

    case 'section': {
      const section = sectionId ? sectionById.get(sectionId) : undefined;
      return {
        id: component.componentId,
        ariaLabel: sectionId ? titleCase(sectionId) : component.componentId,
        layoutType: section?.layoutType ?? 'contained',
      };
    }

    case 'hero':
      return {
        mediaPosition: layoutConfiguration.hero.mediaPosition,
        contentAlignment: layoutConfiguration.hero.contentAlignment,
        ctaStyle,
      };

    case 'cta-banner':
      return { ctaStyle };

    case 'card-grid':
    case 'profile-grid':
      return { columns: component.responsiveRules.columns ?? { mobile: 1, tablet: 2, desktop: 3 } };

    default:
      return {};
  }
}
