import { z } from 'zod';

// Module M10 (DECISIONS.md D-084) — Pipeline Engine. Configurable stage
// list (founder's Decision 2), replacing a hardcoded enum specifically
// for the CRM's own pipeline — the pre-existing `Lead.pipelineStage`
// (M4) is untouched and unrelated (DECISIONS.md D-083). Archived, never
// hard-deleted (founder's Decision 10).
export const salesStageSchema = z.object({
  id: z.string().uuid(),
  key: z.string().min(1),
  name: z.string().min(1),
  order: z.number().int().positive(),
  isWon: z.boolean(),
  isLost: z.boolean(),
  color: z.string().nullable(),
  archivedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type SalesStage = z.infer<typeof salesStageSchema>;

// `key` is a slug: lowercase, letters/numbers/underscores only — mirrors
// every other identifier-like field in this package (e.g. leadTagSchema).
const stageKeySchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9_]+$/, {
    message: 'Stage key may contain only lowercase letters, numbers, and underscores',
  });

export const createSalesStageSchema = z.object({
  key: stageKeySchema,
  name: z.string().trim().min(1).max(100),
  order: z.number().int().positive(),
  isWon: z.boolean().optional().default(false),
  isLost: z.boolean().optional().default(false),
  color: z.string().trim().min(1).max(32).optional(),
});
export type CreateSalesStageInput = z.infer<typeof createSalesStageSchema>;

export const updateSalesStageSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    order: z.number().int().positive().optional(),
    isWon: z.boolean().optional(),
    isLost: z.boolean().optional(),
    color: z.string().trim().min(1).max(32).nullable().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided',
  });
export type UpdateSalesStageInput = z.infer<typeof updateSalesStageSchema>;

export const listSalesStagesQuerySchema = z.object({
  includeArchived: z.coerce.boolean().optional().default(false),
});
export type ListSalesStagesQuery = z.infer<typeof listSalesStagesQuerySchema>;
