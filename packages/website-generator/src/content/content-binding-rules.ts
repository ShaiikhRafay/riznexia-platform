import type {
  BusinessAnalysisOutput,
  BusinessContactInfo,
  ContentFieldBinding,
  ContentSlot,
  ContentValue,
  SupportedComponentType,
} from '@riznexia/shared-types';

export interface ContentBindingContext {
  brandBrief: BusinessAnalysisOutput;
  business: BusinessContactInfo;
  /** The component's own sectionId (its parent section, or its own id for section-level components) — used only for structural (never business-authored) labels. */
  sectionId: string;
  /** The real componentId of the 'contact' section wrapper, when one exists in this manifest — the deterministic CTA target. */
  contactSectionComponentId: string | null;
}

export interface UnresolvedSlot {
  slotName: string;
  required: boolean;
  reason: 'no-source-available';
}

export interface ComponentBindingResult {
  fields: ContentFieldBinding[];
  unresolved: UnresolvedSlot[];
}

function sourcedText(value: string, source: string): ContentValue {
  return { value, source };
}
function sourcedTextList(value: string[], source: string): ContentValue {
  return { value, source };
}
function sourcedLink(
  value: { label?: string; targetComponentId?: string; url?: string },
  source: string,
): ContentValue {
  return { value, source };
}
function sourcedImageRef(photoReference: string, source: string): ContentValue {
  return { value: { photoReference }, source };
}

// A structural label derived purely from a technical identifier (kebab-case
// sectionId -> Title Case) — never business-authored copy. Same technique
// as M8.1/M8.2's placeholderLabelFor().
export function titleCase(id: string): string {
  return id
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function servicesList(brandBrief: BusinessAnalysisOutput): string[] {
  return [...brandBrief.primaryServices, ...brandBrief.secondaryServices];
}

// Module M8.3 (DECISIONS.md D-061+) — one resolver per (componentType,
// slotName) pair that has a real deterministic source. Returns null when
// there is genuinely no source anywhere in the pipeline — the caller
// (bindComponentContent) records that as an explicit unresolved entry,
// never fabricates a value. Every non-null return pairs a real value with
// the exact upstream field it came from (founder's explicit
// "every field traceable to its origin" requirement).
function resolveSlotValue(
  componentType: SupportedComponentType,
  slotName: string,
  context: ContentBindingContext,
): ContentValue | null {
  const { brandBrief, business, sectionId, contactSectionComponentId } = context;

  switch (`${componentType}.${slotName}`) {
    case 'navigation.links':
      // Bound by the caller (needs the full nav item list, not a single
      // slot's context) — see bindNavigationLinks() below.
      return null;

    case 'hero.headline':
      return sourcedText(
        brandBrief.uniqueSellingPoints[0] ?? brandBrief.businessSummary,
        'BusinessAnalysis.brandBrief.uniqueSellingPoints[0]',
      );
    case 'hero.subheadline':
      return sourcedText(brandBrief.businessSummary, 'BusinessAnalysis.brandBrief.businessSummary');
    case 'hero.backgroundImage':
      return business.photos?.[0]
        ? sourcedImageRef(business.photos[0].photoReference, 'Business.photos[0]')
        : null;
    case 'hero.trustSignal':
      return brandBrief.trustSignals[0]
        ? sourcedText(brandBrief.trustSignals[0], 'BusinessAnalysis.brandBrief.trustSignals[0]')
        : null;
    case 'hero.primaryCta':
    case 'cta-banner.ctaLink': {
      const ctaLabel = brandBrief.ctaRecommendations[0];
      return contactSectionComponentId && ctaLabel
        ? sourcedLink(
            { label: ctaLabel, targetComponentId: contactSectionComponentId },
            'BusinessAnalysis.brandBrief.ctaRecommendations[0]',
          )
        : null;
    }
    case 'cta-banner.ctaText': {
      const ctaText = brandBrief.ctaRecommendations[0];
      return ctaText
        ? sourcedText(ctaText, 'BusinessAnalysis.brandBrief.ctaRecommendations[0]')
        : null;
    }
    case 'cta-banner.supportingText':
      return brandBrief.trustSignals[0]
        ? sourcedText(brandBrief.trustSignals[0], 'BusinessAnalysis.brandBrief.trustSignals[0]')
        : null;

    case 'card-grid.items':
    case 'menu-list.items':
      return sourcedTextList(
        servicesList(brandBrief),
        'BusinessAnalysis.brandBrief.primaryServices+secondaryServices',
      );
    case 'card-grid.sectionTitle':
    case 'menu-list.sectionTitle':
    case 'profile-grid.sectionTitle':
    case 'carousel.sectionTitle':
    case 'accordion.sectionTitle':
    case 'schedule-table.sectionTitle':
    case 'pricing-table.sectionTitle':
      return sourcedText(titleCase(sectionId), 'LayoutConfiguration.pageStructure[].sectionId');

    // Testimonials — bound from BusinessAnalysis's AI-suggested social-proof
    // angles, honestly labeled as such (not claimed to be verbatim customer
    // quotes). Founder's resolved fork.
    case 'carousel.items':
      return brandBrief.socialProofSuggestions.length > 0
        ? sourcedTextList(
            brandBrief.socialProofSuggestions,
            'BusinessAnalysis.brandBrief.socialProofSuggestions',
          )
        : null;

    case 'info-panel.body':
      return sourcedText(brandBrief.businessSummary, 'BusinessAnalysis.brandBrief.businessSummary');
    case 'info-panel.heading':
      return sourcedText(titleCase(sectionId), 'LayoutConfiguration.pageStructure[].sectionId');
    case 'info-panel.image':
      return business.photos?.[0]
        ? sourcedImageRef(business.photos[0].photoReference, 'Business.photos[0]')
        : null;

    case 'map-embed.address':
      return sourcedText(`${business.address}, ${business.city}`, 'Business.address+Business.city');
    case 'map-embed.mapEmbedUrl':
      if (business.googleBusinessUrl) {
        return sourcedLink({ url: business.googleBusinessUrl }, 'Business.googleBusinessUrl');
      }
      if (business.latitude !== null && business.longitude !== null) {
        return sourcedLink(
          { url: `https://www.google.com/maps?q=${business.latitude},${business.longitude}` },
          'Business.latitude+Business.longitude',
        );
      }
      return null;

    // No upstream source exists anywhere in the pipeline for these —
    // founder's resolved fork: record as unresolved, never fabricate.
    case 'profile-grid.items':
    case 'logo-strip.logos':
    case 'accordion.items':
    case 'schedule-table.rows':
    case 'pricing-table.plans':
    case 'search-form.fields':
    case 'sidebar.items':
      return null;

    default:
      return null;
  }
}

function bindNavigationLinks(
  context: ContentBindingContext,
  navigationItems: string[],
): ContentValue {
  return {
    value: navigationItems.map((sectionId) => ({
      label: titleCase(sectionId),
      targetComponentId: `section-${sectionId}`,
    })),
    source: 'LayoutConfiguration.navigation.items',
  };
}

/**
 * Binds every requiredContent/optionalContent slot the M8.2 ComponentManifest
 * already declared on this specific component — never invents a new slot
 * (uses the manifest's own recorded slots, not a re-derived lookup table).
 * Pure and deterministic: the same context always produces the same result.
 */
export function bindComponentContent(
  componentType: SupportedComponentType,
  requiredContent: ContentSlot[],
  optionalContent: ContentSlot[],
  context: ContentBindingContext,
  navigationItems: string[],
): ComponentBindingResult {
  const fields: ContentFieldBinding[] = [];
  const unresolved: UnresolvedSlot[] = [];

  const slots = [
    ...requiredContent.map((slot) => ({ ...slot, required: true })),
    ...optionalContent.map((slot) => ({ ...slot, required: false })),
  ];

  for (const slot of slots) {
    const value =
      componentType === 'navigation' && slot.slotName === 'links'
        ? bindNavigationLinks(context, navigationItems)
        : resolveSlotValue(componentType, slot.slotName, context);

    if (value === null) {
      unresolved.push({
        slotName: slot.slotName,
        required: slot.required,
        reason: 'no-source-available',
      });
    } else {
      fields.push({ slotName: slot.slotName, kind: slot.kind, value });
    }
  }

  return { fields, unresolved };
}
