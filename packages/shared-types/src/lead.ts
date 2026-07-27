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

export const leadSchema = z.object({
  id: z.string().uuid(),
  businessName: z.string(),
  category: z.string(),
  city: z.string(),
  address: z.string(),
  websiteStatus: z.enum(WEBSITE_STATUSES),
  pipelineStage: z.enum(PIPELINE_STAGES),
  assignedTo: z.string().uuid().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string().datetime(),
});
export type Lead = z.infer<typeof leadSchema>;

// GET /leads query params (Doc 19 §5) — this module (M1) only implements
// the read path; sort/filter fields mirror what Module M2's pipeline UI
// will need, defined here now so the contract doesn't shift later.
export const listLeadsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  stage: z.enum(PIPELINE_STAGES).optional(),
  city: z.string().optional(),
  category: z.string().optional(),
  assignedTo: z.string().uuid().optional(),
  q: z.string().optional(),
});
export type ListLeadsQuery = z.infer<typeof listLeadsQuerySchema>;
