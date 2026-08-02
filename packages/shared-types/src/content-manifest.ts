import { z } from 'zod';
import { CONTENT_SLOT_KINDS } from './component-manifest';

// Module M8.3 (DECISIONS.md D-061+) — Content Binding output. Every mapped
// field carries its origin (founder's explicit requirement): "value" is
// never stored without a "source" string identifying exactly which
// upstream field it came from. Nothing here is generated, rewritten, or
// invented — generateContentManifest() (packages/website-generator) is a
// pure deterministic mapping, same discipline as M8.1/M8.2's generators.

// A required content slot with genuinely no upstream source anywhere in
// the pipeline (e.g. FAQ, class schedules, pricing plans, client logos,
// individual team-member profiles) is recorded here rather than
// fabricated or silently dropped — the gap is explicit and traceable.
// Kept a closed enum (one value today) so a future reason is a deliberate
// schema change, not a silently-accepted new string.
export const CONTENT_UNRESOLVED_REASONS = ['no-source-available'] as const;
export type ContentUnresolvedReason = (typeof CONTENT_UNRESOLVED_REASONS)[number];

export const STRUCTURED_DATA_TYPES = [
  'LocalBusiness',
  'Organization',
  'BreadcrumbList',
  'FAQPage',
] as const;
export type StructuredDataType = (typeof STRUCTURED_DATA_TYPES)[number];

// Five concrete "sourced value" shapes — one per kind of thing this
// module ever binds. Each pairs a real value with the exact upstream
// field it came from.
export const sourcedTextSchema = z.object({ value: z.string().min(1), source: z.string().min(1) });
export type SourcedText = z.infer<typeof sourcedTextSchema>;

export const sourcedTextListSchema = z.object({
  value: z.array(z.string().min(1)),
  source: z.string().min(1),
});
export type SourcedTextList = z.infer<typeof sourcedTextListSchema>;

// A link is either an internal target (a real componentId within the same
// ComponentManifest — e.g. a CTA pointing at the contact section) or an
// external URL (e.g. a Google Maps/business-profile link) — never both,
// but stored as one shape since Json storage doesn't need a discriminated
// union here (same convention as every other polymorphic Json column in
// this schema).
export const sourcedLinkSchema = z.object({
  value: z.object({
    label: z.string().min(1).optional(),
    targetComponentId: z.string().min(1).optional(),
    url: z.string().min(1).optional(),
  }),
  source: z.string().min(1),
});
export type SourcedLink = z.infer<typeof sourcedLinkSchema>;

export const sourcedLinkListSchema = z.object({
  value: z.array(z.object({ label: z.string().min(1), targetComponentId: z.string().min(1) })),
  source: z.string().min(1),
});
export type SourcedLinkList = z.infer<typeof sourcedLinkListSchema>;

// A reference only — the opaque provider photo token, never fetched or
// generated image bytes.
export const sourcedImageRefSchema = z.object({
  value: z.object({ photoReference: z.string().min(1) }),
  source: z.string().min(1),
});
export type SourcedImageRef = z.infer<typeof sourcedImageRefSchema>;

export const contentValueSchema = z.union([
  sourcedTextSchema,
  sourcedTextListSchema,
  sourcedLinkSchema,
  sourcedLinkListSchema,
  sourcedImageRefSchema,
]);
export type ContentValue = z.infer<typeof contentValueSchema>;

export const contentFieldBindingSchema = z.object({
  slotName: z.string().min(1),
  kind: z.enum(CONTENT_SLOT_KINDS),
  value: contentValueSchema,
});
export type ContentFieldBinding = z.infer<typeof contentFieldBindingSchema>;

export const componentContentBindingSchema = z.object({
  componentId: z.string().min(1),
  fields: z.array(contentFieldBindingSchema),
});
export type ComponentContentBinding = z.infer<typeof componentContentBindingSchema>;

export const unresolvedBindingSchema = z.object({
  componentId: z.string().min(1),
  slotName: z.string().min(1),
  required: z.boolean(),
  reason: z.enum(CONTENT_UNRESOLVED_REASONS),
});
export type UnresolvedBinding = z.infer<typeof unresolvedBindingSchema>;

export const seoMetadataSchema = z.object({
  keywords: sourcedTextListSchema,
  localSeoSuggestions: sourcedTextListSchema,
  metaTitle: sourcedTextSchema.nullable(),
  metaDescription: sourcedTextSchema.nullable(),
});
export type SeoMetadata = z.infer<typeof seoMetadataSchema>;

export const structuredDataBindingSchema = z.object({
  type: z.enum(STRUCTURED_DATA_TYPES),
  data: z.record(z.string(), contentValueSchema),
});
export type StructuredDataBinding = z.infer<typeof structuredDataBindingSchema>;

export const contentManifestSchema = z.object({
  id: z.string().uuid(),
  businessId: z.string().uuid(),
  businessAnalysisId: z.string().uuid(),
  themeConfigurationId: z.string().uuid(),
  layoutConfigurationId: z.string().uuid(),
  componentManifestId: z.string().uuid(),
  configVersion: z.number().int().positive(),
  contentEngineVersion: z.string().min(1),

  componentContent: z.array(componentContentBindingSchema),
  unresolvedBindings: z.array(unresolvedBindingSchema),
  seoMetadata: seoMetadataSchema,
  structuredData: z.array(structuredDataBindingSchema),

  createdAt: z.string(),
});
export type ContentManifest = z.infer<typeof contentManifestSchema>;

// Not a persisted/API-response shape — the minimal slice of the M2/M5
// `Business` record this module needs as an additional input beyond the
// four the phase brief named (BusinessAnalysis/ThemeConfiguration/
// LayoutConfiguration/ComponentManifest). Without it, Contact Information,
// Business Hours, Gallery References, and LocalBusiness structured data
// are impossible to bind — none of those live in BusinessAnalysis's
// brandBrief. `openingHours` stays `unknown` (opaque Places-shaped Json,
// no stable typed contract anywhere in this codebase) and is passed
// through verbatim, never parsed/reformatted.
export interface BusinessContactInfo {
  businessName: string;
  address: string;
  city: string;
  phone: string | null;
  photos: { photoReference: string }[] | null;
  openingHours: unknown | null;
  rating: number | null;
  reviewCount: number | null;
  googleBusinessUrl: string | null;
  latitude: number | null;
  longitude: number | null;
}
