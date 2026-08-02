import type { SupportedComponentType } from '@riznexia/shared-types';

// Module M8.2 (DECISIONS.md D-055) — a single, theme-independent lookup
// from every theme-authored componentId (across all 8 registered themes'
// componentSet) to its closed SupportedComponentType. Global rather than
// per-theme (unlike sectionComponentMap, D-049, which is legitimately
// theme-scoped since section names vary by theme) because a componentId
// like 'hero-banner' means the same structural thing in every theme that
// uses it — duplicating this mapping 8 times would risk inconsistent
// classification across themes with no benefit. Closes the "only
// supported components may be generated" requirement: `generateComponentManifest()`
// (packages/website-generator) throws if it encounters a componentId not
// listed here, rather than silently passing an unclassified component through.
export const COMPONENT_TYPE_REGISTRY: Record<string, SupportedComponentType> = {
  'hero-banner': 'hero',

  'service-cards': 'card-grid',
  'listing-grid': 'card-grid',
  'gallery-grid': 'card-grid',
  'case-results': 'card-grid',

  'team-profiles': 'profile-grid',
  'trainer-profiles': 'profile-grid',
  'attorney-profiles': 'profile-grid',
  'provider-profiles': 'profile-grid',
  'agent-profiles': 'profile-grid',
  'staff-profiles': 'profile-grid',

  'testimonial-carousel': 'carousel',

  'contact-cta': 'cta-banner',
  'appointment-cta': 'cta-banner',
  'membership-cta': 'cta-banner',
  'consultation-cta': 'cta-banner',
  'reservation-cta': 'cta-banner',
  'inquiry-cta': 'cta-banner',
  'booking-cta': 'cta-banner',

  'client-logos': 'logo-strip',

  'about-section': 'info-panel',
  'insurance-info': 'info-panel',
  'patient-resources': 'info-panel',
  'practice-areas': 'info-panel',

  'faq-accordion': 'accordion',
  'class-schedule': 'schedule-table',
  'pricing-plans': 'pricing-table',
  'property-search': 'search-form',
  'map-embed': 'map-embed',

  'menu-showcase': 'menu-list',
  'service-menu': 'menu-list',
};
