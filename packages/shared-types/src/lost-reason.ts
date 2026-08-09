import { z } from 'zod';

// Module M10 (DECISIONS.md D-084) — Pipeline Engine. Configurable lost-reason
// list (founder's explicit Decision 11: "Use a LostReason table instead of
// a fixed enum"), same shape/archive discipline as `SalesStage`.
export const lostReasonSchema = z.object({
  id: z.string().uuid(),
  key: z.string().min(1),
  label: z.string().min(1),
  order: z.number().int().positive(),
  archivedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type LostReason = z.infer<typeof lostReasonSchema>;

const lostReasonKeySchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9_]+$/, {
    message: 'Lost reason key may contain only lowercase letters, numbers, and underscores',
  });

export const createLostReasonSchema = z.object({
  key: lostReasonKeySchema,
  label: z.string().trim().min(1).max(100),
  order: z.number().int().positive(),
});
export type CreateLostReasonInput = z.infer<typeof createLostReasonSchema>;

export const updateLostReasonSchema = z
  .object({
    label: z.string().trim().min(1).max(100).optional(),
    order: z.number().int().positive().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided',
  });
export type UpdateLostReasonInput = z.infer<typeof updateLostReasonSchema>;

export const listLostReasonsQuerySchema = z.object({
  includeArchived: z.coerce.boolean().optional().default(false),
});
export type ListLostReasonsQuery = z.infer<typeof listLostReasonsQuerySchema>;
