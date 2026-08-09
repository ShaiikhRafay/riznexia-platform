import { z } from 'zod';

// Module M10 (DECISIONS.md D-083) — Pipeline Engine. The CRM bounded
// context's own per-lead record, one-to-one with `Lead`. `Lead` itself
// carries none of these fields (founder's explicit Decision 3) — this is
// the entire "stage, deal value, lost reason, owner, follow-up metadata"
// list from that decision.
export const leadCrmSchema = z.object({
  id: z.string().uuid(),
  leadId: z.string().uuid(),
  stageId: z.string().uuid(),
  dealValueUsd: z.number().nonnegative().nullable(),
  lostReasonId: z.string().uuid().nullable(),
  ownerId: z.string().uuid().nullable(),
  nextFollowUpAt: z.string().datetime().nullable(),
  lastActivityAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type LeadCRM = z.infer<typeof leadCrmSchema>;

// POST /leads/:id/crm/stage — a dedicated action, not folded into a
// generic PATCH (mirrors M9's "one clear way to do each action" precedent).
// `lostReasonId` is required by the service layer (not this schema, since
// whether it's required depends on the *target* stage's `isLost` flag,
// which this schema can't see) whenever the transition moves into an
// `isLost` stage.
export const transitionLeadStageSchema = z.object({
  stageId: z.string().uuid(),
  lostReasonId: z.string().uuid().optional(),
});
export type TransitionLeadStageInput = z.infer<typeof transitionLeadStageSchema>;

// POST /leads/:id/crm/owner — `ownerId: null` explicitly unassigns
// (distinct from omitting the field), same convention as `Lead.assignedTo`.
export const assignLeadOwnerSchema = z.object({
  ownerId: z.string().uuid().nullable(),
});
export type AssignLeadOwnerInput = z.infer<typeof assignLeadOwnerSchema>;

// PATCH /leads/:id/crm — every other CRM field not covered by a
// dedicated action (stage/owner both have their own endpoints above).
export const updateLeadCrmSchema = z
  .object({
    dealValueUsd: z.number().nonnegative().nullable().optional(),
    nextFollowUpAt: z.string().datetime().nullable().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided',
  });
export type UpdateLeadCrmInput = z.infer<typeof updateLeadCrmSchema>;
