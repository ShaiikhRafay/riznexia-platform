import { z } from 'zod';

// Module M10 (DECISIONS.md D-086) — Activity Engine. Manual logging is
// restricted to the four interaction types a rep genuinely originates by
// hand (Calls/Emails/Meetings/WhatsApp, founder's Core Features list) —
// Notes already has its own endpoint (POST /leads/:id/notes, Module M4)
// and website_generated/preview_sent/proposal_sent are system-emitted by
// their owning engines, never through this manual path.
export const LOGGABLE_ACTIVITY_TYPES = ['call', 'email', 'meeting', 'whatsapp'] as const;
export type LoggableActivityType = (typeof LOGGABLE_ACTIVITY_TYPES)[number];

export const ACTIVITY_NOTE_MAX_LENGTH = 2000;

// `occurredAt` is optional so a rep can backdate a call logged after the
// fact; omitted, the service stamps "now". Stored inside LeadActivity's
// existing `detail` JSON column — no new table.
export const logLeadActivitySchema = z.object({
  type: z.enum(LOGGABLE_ACTIVITY_TYPES),
  note: z.string().trim().min(1).max(ACTIVITY_NOTE_MAX_LENGTH).optional(),
  occurredAt: z.string().datetime().optional(),
});
export type LogLeadActivityInput = z.infer<typeof logLeadActivitySchema>;
