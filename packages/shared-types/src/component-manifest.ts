import { z } from 'zod';
import { CARD_STYLES, CTA_STYLES, ANIMATION_LEVELS, CONTRAST_LEVELS } from './theme-configuration';
import { SECTION_RESPONSIVE_RULES } from './layout-configuration';

// Module M8.2 (DECISIONS.md D-055+) — Component Generator output. A closed
// taxonomy (three structural types the generator itself introduces, plus
// every theme-authored componentId across all 8 M7 themes classified onto
// one of 13 supported types — packages/themes' COMPONENT_TYPE_REGISTRY is
// the source of truth for that classification) is what makes "only
// supported components may be generated" enforceable: an unrecognized
// componentId fails generation rather than silently passing through as an
// untyped/hallucinated component.
export const SUPPORTED_COMPONENT_TYPES = [
  // Structural — introduced by the generator itself, not theme-owned.
  'navigation',
  'section',
  'sidebar',
  // Theme-owned — every M7 componentSet entry classifies onto exactly one of these.
  'hero',
  'card-grid',
  'profile-grid',
  'carousel',
  'cta-banner',
  'logo-strip',
  'info-panel',
  'accordion',
  'schedule-table',
  'pricing-table',
  'search-form',
  'map-embed',
  'menu-list',
] as const;
export type SupportedComponentType = (typeof SUPPORTED_COMPONENT_TYPES)[number];

export const CONTENT_SLOT_KINDS = ['text', 'image', 'icon', 'link', 'list'] as const;
export type ContentSlotKind = (typeof CONTENT_SLOT_KINDS)[number];

export const ACCESSIBILITY_ROLES = [
  'banner',
  'navigation',
  'region',
  'complementary',
  'contentinfo',
  'search',
  'table',
] as const;
export type AccessibilityRole = (typeof ACCESSIBILITY_ROLES)[number];

// The only deterministic condition this version of the generator ever
// produces — ties directly to LayoutConfiguration.sidebar being non-null.
// Kept a closed enum (not a free string) so a future condition is a
// deliberate schema change, not a silently-accepted new string.
export const VISIBILITY_CONDITIONS = ['sidebar-present'] as const;
export type VisibilityCondition = (typeof VISIBILITY_CONDITIONS)[number];

// Theme Tokens (founder's explicit requirement) — computed once per
// manifest from ThemeConfiguration; every ComponentDefinition references
// these by path string (e.g. "token.primary", "token.radius.large"),
// never by copying the resolved value. `radius`/`spacing` are fixed
// universal scales (like LayoutConfiguration's fixed breakpoints), not
// theme-specific values themselves — only which rung a given component
// defaults to is theme-derived (via cardStyle).
export const themeTokensSchema = z.object({
  primary: z.string().min(1),
  secondary: z.string().min(1),
  accent: z.string().min(1),
  background: z.string().min(1),
  text: z.string().min(1),
  heading: z.string().min(1),
  body: z.string().min(1),
  radius: z.object({
    small: z.string().min(1),
    medium: z.string().min(1),
    large: z.string().min(1),
    full: z.string().min(1),
  }),
  spacing: z.object({
    xs: z.string().min(1),
    sm: z.string().min(1),
    md: z.string().min(1),
    lg: z.string().min(1),
    xl: z.string().min(1),
  }),
  shadow: z.enum(['none', 'subtle', 'moderate', 'pronounced']),
  button: z.enum(CTA_STYLES),
  card: z.enum(CARD_STYLES),
  animation: z.enum(ANIMATION_LEVELS),
});
export type ThemeTokens = z.infer<typeof themeTokensSchema>;

// A content contract, not content itself — declares what a component
// needs (slotName + kind), never a bound value. Binding real business
// content into these slots is M8.3's job.
export const contentSlotSchema = z.object({
  slotName: z.string().min(1),
  kind: z.enum(CONTENT_SLOT_KINDS),
});
export type ContentSlot = z.infer<typeof contentSlotSchema>;

// The flattened, binding-ready view of requiredContent+optionalContent —
// `placeholderLabel` is a generic structural label derived purely from
// `slotName` (e.g. "[Headline]"), never business-specific copy: it is a
// structural marker for a UI/editor preview before real content exists,
// not generated website content.
export const placeholderDefinitionSchema = z.object({
  slotName: z.string().min(1),
  kind: z.enum(CONTENT_SLOT_KINDS),
  required: z.boolean(),
  placeholderLabel: z.string().min(1),
});
export type PlaceholderDefinition = z.infer<typeof placeholderDefinitionSchema>;

export const componentResponsiveRulesSchema = z.object({
  rule: z.enum(SECTION_RESPONSIVE_RULES),
  columns: z
    .object({
      mobile: z.number().int().positive(),
      tablet: z.number().int().positive(),
      desktop: z.number().int().positive(),
    })
    .optional(),
});
export type ComponentResponsiveRules = z.infer<typeof componentResponsiveRulesSchema>;

export const componentAccessibilitySchema = z.object({
  role: z.enum(ACCESSIBILITY_ROLES),
  altTextRequired: z.boolean(),
  minTouchTargetPx: z.number().int().positive(),
  contrastLevel: z.enum(CONTRAST_LEVELS),
});
export type ComponentAccessibility = z.infer<typeof componentAccessibilitySchema>;

// Discriminated union rather than a free-standing `condition` field that
// would be meaningless (and untestable-as-absent) when mode is 'always'.
export const componentVisibilitySchema = z.discriminatedUnion('mode', [
  z.object({ mode: z.literal('always') }),
  z.object({ mode: z.literal('conditional'), condition: z.enum(VISIBILITY_CONDITIONS) }),
]);
export type ComponentVisibility = z.infer<typeof componentVisibilitySchema>;

export const componentDefinitionSchema = z.object({
  componentId: z.string().min(1),
  componentType: z.enum(SUPPORTED_COMPONENT_TYPES),
  parentComponentId: z.string().nullable(),
  childComponentIds: z.array(z.string()),
  requiredContent: z.array(contentSlotSchema),
  optionalContent: z.array(contentSlotSchema),
  // Reference paths only (e.g. "token.radius.large"), never resolved
  // values — resolve against the manifest's own top-level `themeTokens`.
  themeTokens: z.record(z.string(), z.string()),
  responsiveRules: componentResponsiveRulesSchema,
  accessibility: componentAccessibilitySchema,
  visibility: componentVisibilitySchema,
  placeholders: z.array(placeholderDefinitionSchema),
});
export type ComponentDefinition = z.infer<typeof componentDefinitionSchema>;

export const componentManifestSchema = z.object({
  id: z.string().uuid(),
  businessId: z.string().uuid(),
  businessAnalysisId: z.string().uuid(),
  themeConfigurationId: z.string().uuid(),
  layoutConfigurationId: z.string().uuid(),
  configVersion: z.number().int().positive(),
  componentEngineVersion: z.string().min(1),
  themeTokens: themeTokensSchema,
  components: z.array(componentDefinitionSchema),
  createdAt: z.string(),
});
export type ComponentManifest = z.infer<typeof componentManifestSchema>;
