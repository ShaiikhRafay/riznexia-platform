import { z } from 'zod';

// Module M10 (DECISIONS.md D-087) — founder's explicit Decision 12.
// Single-organization singleton (same scope as `TeamMember`'s own "one
// internal workspace" assumption) — deliberately minimal: exactly the
// five fields named in the brief, no speculative extras.
export const businessHoursSchema = z.record(
  z.string(),
  z.object({ start: z.string().min(1), end: z.string().min(1) }),
);
export type BusinessHours = z.infer<typeof businessHoursSchema>;

export const crmSettingsSchema = z.object({
  id: z.string().uuid(),
  defaultStageId: z.string().uuid().nullable(),
  currency: z.string().min(1),
  timezone: z.string().min(1),
  businessHours: businessHoursSchema.nullable(),
  defaultReminderMinutesBeforeDue: z.number().int().positive().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type CrmSettings = z.infer<typeof crmSettingsSchema>;

// ISO 4217 alpha codes are 3 uppercase letters — not validated against
// the full real-world currency list (no such list exists anywhere in
// this codebase), just shape.
const currencyCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, { message: 'Currency must be a 3-letter ISO 4217 code' });

export const updateCrmSettingsSchema = z
  .object({
    defaultStageId: z.string().uuid().nullable().optional(),
    currency: currencyCodeSchema.optional(),
    timezone: z.string().trim().min(1).max(64).optional(),
    businessHours: businessHoursSchema.nullable().optional(),
    defaultReminderMinutesBeforeDue: z.number().int().positive().nullable().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided',
  });
export type UpdateCrmSettingsInput = z.infer<typeof updateCrmSettingsSchema>;
