import type {
  AccessibilityRole,
  ContentSlot,
  SupportedComponentType,
} from '@riznexia/shared-types';

export interface ComponentTypeDefinition {
  requiredContent: ContentSlot[];
  optionalContent: ContentSlot[];
  accessibilityRole: AccessibilityRole;
  altTextRequired: boolean;
}

// Module M8.2 (DECISIONS.md D-055+) — hand-authored per-type rules,
// covering all 16 SUPPORTED_COMPONENT_TYPES (3 structural + 13
// theme-owned) — same "authored data, not generated" discipline as M7's 8
// theme definitions (D-047's "Reviewed and found sound" note). Declares
// only the content CONTRACT (slotName + kind) each component type needs;
// never a bound value — binding real business content is M8.3's job.
export const COMPONENT_TYPE_DEFINITIONS: Record<SupportedComponentType, ComponentTypeDefinition> = {
  navigation: {
    requiredContent: [{ slotName: 'links', kind: 'list' }],
    optionalContent: [],
    accessibilityRole: 'navigation',
    altTextRequired: false,
  },
  section: {
    requiredContent: [],
    optionalContent: [],
    accessibilityRole: 'region',
    altTextRequired: false,
  },
  sidebar: {
    requiredContent: [],
    optionalContent: [{ slotName: 'items', kind: 'list' }],
    accessibilityRole: 'complementary',
    altTextRequired: false,
  },
  hero: {
    requiredContent: [
      { slotName: 'headline', kind: 'text' },
      { slotName: 'primaryCta', kind: 'link' },
    ],
    optionalContent: [
      { slotName: 'subheadline', kind: 'text' },
      { slotName: 'backgroundImage', kind: 'image' },
    ],
    accessibilityRole: 'banner',
    altTextRequired: true,
  },
  'card-grid': {
    requiredContent: [{ slotName: 'items', kind: 'list' }],
    optionalContent: [{ slotName: 'sectionTitle', kind: 'text' }],
    accessibilityRole: 'region',
    altTextRequired: true,
  },
  'profile-grid': {
    requiredContent: [{ slotName: 'items', kind: 'list' }],
    optionalContent: [{ slotName: 'sectionTitle', kind: 'text' }],
    accessibilityRole: 'region',
    altTextRequired: true,
  },
  carousel: {
    requiredContent: [{ slotName: 'items', kind: 'list' }],
    optionalContent: [{ slotName: 'sectionTitle', kind: 'text' }],
    accessibilityRole: 'region',
    altTextRequired: false,
  },
  'cta-banner': {
    requiredContent: [
      { slotName: 'ctaText', kind: 'text' },
      { slotName: 'ctaLink', kind: 'link' },
    ],
    optionalContent: [{ slotName: 'supportingText', kind: 'text' }],
    accessibilityRole: 'region',
    altTextRequired: false,
  },
  'logo-strip': {
    requiredContent: [{ slotName: 'logos', kind: 'list' }],
    optionalContent: [],
    accessibilityRole: 'region',
    altTextRequired: true,
  },
  'info-panel': {
    requiredContent: [{ slotName: 'body', kind: 'text' }],
    optionalContent: [
      { slotName: 'heading', kind: 'text' },
      { slotName: 'image', kind: 'image' },
    ],
    accessibilityRole: 'region',
    altTextRequired: true,
  },
  accordion: {
    requiredContent: [{ slotName: 'items', kind: 'list' }],
    optionalContent: [{ slotName: 'sectionTitle', kind: 'text' }],
    accessibilityRole: 'region',
    altTextRequired: false,
  },
  'schedule-table': {
    requiredContent: [{ slotName: 'rows', kind: 'list' }],
    optionalContent: [{ slotName: 'sectionTitle', kind: 'text' }],
    accessibilityRole: 'table',
    altTextRequired: false,
  },
  'pricing-table': {
    requiredContent: [{ slotName: 'plans', kind: 'list' }],
    optionalContent: [{ slotName: 'sectionTitle', kind: 'text' }],
    accessibilityRole: 'region',
    altTextRequired: false,
  },
  'search-form': {
    requiredContent: [{ slotName: 'fields', kind: 'list' }],
    optionalContent: [],
    accessibilityRole: 'search',
    altTextRequired: false,
  },
  'map-embed': {
    requiredContent: [{ slotName: 'address', kind: 'text' }],
    optionalContent: [{ slotName: 'mapEmbedUrl', kind: 'link' }],
    accessibilityRole: 'region',
    altTextRequired: false,
  },
  'menu-list': {
    requiredContent: [{ slotName: 'items', kind: 'list' }],
    optionalContent: [{ slotName: 'sectionTitle', kind: 'text' }],
    accessibilityRole: 'region',
    altTextRequired: true,
  },
};

// Token reference paths a component type defaults to — always paths into
// the manifest's own `themeTokens`, never resolved values. `radiusToken`
// is theme-derived (via cardStyle, see component-tokens.ts); every other
// entry here is a fixed token name.
export function baseTokensForType(
  componentType: SupportedComponentType,
  radiusToken: string,
): Record<string, string> {
  switch (componentType) {
    case 'navigation':
      return { backgroundColor: 'token.background', textColor: 'token.text', font: 'token.body' };
    case 'section':
      return { spacing: 'token.spacing.lg' };
    case 'sidebar':
      return { backgroundColor: 'token.background', spacing: 'token.spacing.md' };
    case 'hero':
      return {
        backgroundColor: 'token.background',
        textColor: 'token.text',
        font: 'token.heading',
        spacing: 'token.spacing.xl',
      };
    case 'card-grid':
    case 'profile-grid':
    case 'menu-list':
      return { radius: radiusToken, shadow: 'token.shadow', spacing: 'token.spacing.md' };
    case 'carousel':
      return { radius: radiusToken, spacing: 'token.spacing.md' };
    case 'cta-banner':
      return {
        backgroundColor: 'token.primary',
        textColor: 'token.background',
        buttonStyle: 'token.button',
        radius: radiusToken,
      };
    case 'logo-strip':
      return { spacing: 'token.spacing.lg' };
    case 'info-panel':
      return { textColor: 'token.text', font: 'token.body', spacing: 'token.spacing.md' };
    case 'accordion':
      return { textColor: 'token.text', font: 'token.body', radius: radiusToken };
    case 'schedule-table':
      return { textColor: 'token.text', font: 'token.body' };
    case 'pricing-table':
      return { radius: radiusToken, shadow: 'token.shadow', spacing: 'token.spacing.md' };
    case 'search-form':
      return { radius: radiusToken, spacing: 'token.spacing.sm' };
    case 'map-embed':
      return { radius: radiusToken };
  }
}
