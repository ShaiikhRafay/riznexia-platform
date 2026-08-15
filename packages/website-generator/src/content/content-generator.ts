import type {
  BusinessAnalysisOutput,
  BusinessContactInfo,
  ComponentContentBinding,
  ComponentManifest,
  LayoutConfiguration,
  SeoMetadata,
  StructuredDataBinding,
  ThemeConfiguration,
  UnresolvedBinding,
} from '@riznexia/shared-types';
import { bindComponentContent } from './content-binding-rules';
import { bindSeoMetadata, bindStructuredData } from './seo-binder';

// Versions this module's binding rules (content-binding-rules.ts,
// seo-binder.ts) — distinct from componentEngineVersion/layoutEngineVersion/
// themeVersion, which version its four inputs.
export const CONTENT_ENGINE_VERSION = 'v1.0';

export interface ContentManifestContent {
  contentEngineVersion: string;
  componentContent: ComponentContentBinding[];
  unresolvedBindings: UnresolvedBinding[];
  seoMetadata: SeoMetadata;
  structuredData: StructuredDataBinding[];
}

/**
 * Pure and deterministic: the same (brandBrief, business, themeConfiguration,
 * layoutConfiguration, componentManifest) tuple always produces a
 * structurally identical ContentManifestContent. No AI call, no prompt
 * execution, no LLM provider, no content regeneration — every bound value
 * is either a verbatim upstream field, a real array element, or a fixed
 * non-creative template over real fields (metaTitle). `themeConfiguration`
 * is accepted per the phase brief's stated input list but not deeply
 * exercised by this version's binding rules — nothing here currently
 * varies by theme style, only by real business data and layout structure.
 *
 * Binds only the content slots M8.2's ComponentManifest already declared
 * (requiredContent/optionalContent) — never invents a new slot. A slot
 * with no real upstream source anywhere in the pipeline is recorded in
 * `unresolvedBindings`, never fabricated (founder's resolved fork).
 */
export function generateContentManifest(
  brandBrief: BusinessAnalysisOutput,
  business: BusinessContactInfo,
  _themeConfiguration: ThemeConfiguration,
  layoutConfiguration: LayoutConfiguration,
  componentManifest: ComponentManifest,
): ContentManifestContent {
  const contactSectionComponentId = resolveContactSectionComponentId(
    layoutConfiguration,
    componentManifest,
  );
  const navigationItems = layoutConfiguration.navigation.items;

  const componentContent: ComponentContentBinding[] = [];
  const unresolvedBindings: UnresolvedBinding[] = [];
  let faqItems: string[] | null = null;

  for (const component of componentManifest.components) {
    if (component.requiredContent.length === 0 && component.optionalContent.length === 0) {
      continue;
    }

    const sectionId = deriveSectionId(component);
    const result = bindComponentContent(
      component.componentType,
      component.requiredContent,
      component.optionalContent,
      {
        brandBrief,
        business,
        sectionId,
        contactSectionComponentId,
        componentId: component.componentId,
      },
      navigationItems,
    );

    if (result.fields.length > 0) {
      componentContent.push({ componentId: component.componentId, fields: result.fields });
    }
    for (const slot of result.unresolved) {
      unresolvedBindings.push({
        componentId: component.componentId,
        slotName: slot.slotName,
        required: slot.required,
        reason: slot.reason,
      });
    }

    if (component.componentType === 'accordion') {
      const itemsField = result.fields.find((field) => field.slotName === 'items');
      if (itemsField && Array.isArray(itemsField.value.value)) {
        faqItems = itemsField.value.value as string[];
      }
    }
  }

  const seoMetadata = bindSeoMetadata(brandBrief, business);
  const structuredData = bindStructuredData(
    business,
    layoutConfiguration.pageStructure.map((section) => section.sectionId),
    faqItems,
  );

  return {
    contentEngineVersion: CONTENT_ENGINE_VERSION,
    componentContent,
    unresolvedBindings,
    seoMetadata,
    structuredData,
  };
}

function deriveSectionId(component: ComponentManifest['components'][number]): string {
  if (component.componentType === 'section') {
    return component.componentId.replace(/^section-/, '');
  }
  if (component.parentComponentId?.startsWith('section-')) {
    return component.parentComponentId.replace(/^section-/, '');
  }
  return '';
}

function resolveContactSectionComponentId(
  layoutConfiguration: LayoutConfiguration,
  componentManifest: ComponentManifest,
): string | null {
  const knownSectionIds = new Set(
    componentManifest.components
      .filter((c) => c.componentType === 'section')
      .map((c) => c.componentId),
  );

  if (knownSectionIds.has('section-contact')) {
    return 'section-contact';
  }

  const nonFooterSections = layoutConfiguration.pageStructure.filter(
    (section) => section.sectionId !== 'footer',
  );
  const lastSection = nonFooterSections[nonFooterSections.length - 1];
  const lastSectionComponentId = lastSection ? `section-${lastSection.sectionId}` : null;
  return lastSectionComponentId && knownSectionIds.has(lastSectionComponentId)
    ? lastSectionComponentId
    : null;
}
