import { z } from 'zod';

// Matches docs/19-api-architecture.md §5 `Lead` schema and the
// website_status_type / pipeline_stage Prisma enums (Doc 18), lowercase
// per the API contract.
export const WEBSITE_STATUSES = ['none', 'outdated', 'present'] as const;
export type WebsiteStatus = (typeof WEBSITE_STATUSES)[number];

export const PIPELINE_STAGES = [
  'new',
  'qualified',
  'contacted',
  'in_discussion',
  'won',
  'lost',
] as const;
export type PipelineStage = (typeof PIPELINE_STAGES)[number];

// Module M4 (DECISIONS.md D-031). Tags are free-form, but not unconstrained:
// bounded length and a character allowlist keep them usable as filter values
// and prevent a tag that can't round-trip through a query string. Lowercased
// at the validation boundary so `VIP` and `vip` are the same tag — the one
// piece of governance a plain string[] can still enforce cheaply.
export const TAG_MAX_LENGTH = 32;
export const MAX_TAGS_PER_LEAD = 20;

export const leadTagSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1)
  .max(TAG_MAX_LENGTH)
  .regex(/^[a-z0-9][a-z0-9 _-]*$/, {
    message: 'Tags may contain letters, numbers, spaces, hyphens and underscores',
  });

export const leadTagsSchema = z.array(leadTagSchema).max(MAX_TAGS_PER_LEAD);

export const leadSchema = z.object({
  id: z.string().uuid(),
  businessId: z.string().uuid(),
  businessName: z.string(),
  category: z.string(),
  city: z.string(),
  address: z.string(),
  websiteStatus: z.enum(WEBSITE_STATUSES),
  pipelineStage: z.enum(PIPELINE_STAGES),
  assignedTo: z.string().uuid().nullable(),
  tags: z.array(z.string()),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Lead = z.infer<typeof leadSchema>;

// Module M4. A Lead is always the pursuit of an existing Business (Module
// M2 made `businessId` a required unique FK), so creation references one
// rather than carrying business fields inline. Manual business entry — BRD
// §9's "allow manual lead entry as fallback" — would need `Business` to
// tolerate a null `googlePlaceId`, which is Module M5's territory, not this
// module's (DECISIONS.md D-030).
export const createLeadSchema = z.object({
  businessId: z.string().uuid(),
  pipelineStage: z.enum(PIPELINE_STAGES).optional(),
  assignedTo: z.string().uuid().nullable().optional(),
  tags: leadTagsSchema.optional(),
});
export type CreateLeadInput = z.infer<typeof createLeadSchema>;

// PATCH semantics: every field optional, but an empty body is a client
// error rather than a silent no-op that still returns 200 and writes an
// audit row implying something changed.
//
// `assignedTo` is nullable-optional on purpose, and the two are different:
// omitted means "leave assignment alone", explicit `null` means "unassign".
// `.strict()` rejects unknown keys so a typo'd field name fails loudly
// instead of being silently dropped.
export const updateLeadSchema = z
  .object({
    pipelineStage: z.enum(PIPELINE_STAGES).optional(),
    assignedTo: z.string().uuid().nullable().optional(),
    tags: leadTagsSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided',
  });
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;

export const NOTE_MAX_LENGTH = 5000;

export const createLeadNoteSchema = z.object({
  body: z.string().trim().min(1).max(NOTE_MAX_LENGTH),
});
export type CreateLeadNoteInput = z.infer<typeof createLeadNoteSchema>;

export const leadNoteSchema = z.object({
  id: z.string().uuid(),
  leadId: z.string().uuid(),
  authorId: z.string().uuid().nullable(),
  body: z.string(),
  createdAt: z.string().datetime(),
});
export type LeadNote = z.infer<typeof leadNoteSchema>;

// Mirrors the `LeadActivityType` Prisma enum (Doc 18 §8), lowercase per the
// API contract — same casing split as every other enum in this package.
export const LEAD_ACTIVITY_TYPES = [
  'created',
  'stage_changed',
  'assigned',
  'unassigned',
  'note_added',
  'tags_changed',
  'deleted',
] as const;
export type LeadActivityType = (typeof LEAD_ACTIVITY_TYPES)[number];

export const leadActivitySchema = z.object({
  id: z.string().uuid(),
  leadId: z.string().uuid(),
  actorId: z.string().uuid().nullable(),
  type: z.enum(LEAD_ACTIVITY_TYPES),
  detail: z.record(z.unknown()).nullable(),
  createdAt: z.string().datetime(),
});
export type LeadActivity = z.infer<typeof leadActivitySchema>;

// Doc 19 §1: `?sort=field` ascending, `?sort=-field` descending, each
// endpoint whitelisting its sortable fields. Validated in the service
// (not as a zod enum) so an unlisted field returns Doc 19's documented
// `400 INVALID_SORT_FIELD` rather than a generic `VALIDATION_ERROR`.
export const LEAD_SORT_FIELDS = [
  'createdAt',
  'updatedAt',
  'pipelineStage',
  'businessName',
] as const;
export type LeadSortField = (typeof LEAD_SORT_FIELDS)[number];

// GET /leads query params (Doc 19 §5).
//
// `q` requires 2+ chars (trimmed): a 1-character search runs an unindexed
// `ILIKE '%x%'` scan across every lead (Doc 22 audit finding #6) — no
// index can serve a single-character wildcard efficiently, so this is
// rejected at the validation boundary rather than left to degrade at scale.
export const listLeadsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  stage: z.enum(PIPELINE_STAGES).optional(),
  city: z.string().trim().optional(),
  category: z.string().trim().optional(),
  assignedTo: z.string().uuid().optional(),
  tag: leadTagSchema.optional(),
  q: z.string().trim().min(2).max(100).optional(),
  sort: z.string().trim().min(1).max(64).optional(),
});
export type ListLeadsQuery = z.infer<typeof listLeadsQuerySchema>;

// Notes and activity are both append-only, strictly chronological lists —
// no filtering or sorting to expose, so their query contract is just the
// shared pagination pair rather than a copy of the leads one.
export const listLeadSubResourceQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
});
export type ListLeadSubResourceQuery = z.infer<typeof listLeadSubResourceQuerySchema>;
