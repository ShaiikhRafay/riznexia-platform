import { LEAD_ACTIVITY_TYPES, type LeadActivityType } from '@riznexia/shared-types';

// Feature-local duplicate of F4's own `lead-activity-presentation.ts` —
// same closed 14-value enum, needed here for both the Activities page
// (Calls/Meetings/Emails/WhatsApp categories) and Lead CRM Details'
// unfiltered Timeline section. Not cross-imported: this codebase's reuse
// convention is at the hook/`api/` layer only.
export const LEAD_ACTIVITY_LABELS: Record<LeadActivityType, string> = {
  created: 'Lead created',
  stage_changed: 'Stage changed',
  assigned: 'Assigned',
  unassigned: 'Unassigned',
  note_added: 'Note added',
  tags_changed: 'Tags changed',
  deleted: 'Lead deleted',
  call: 'Call logged',
  email: 'Email logged',
  meeting: 'Meeting logged',
  whatsapp: 'WhatsApp message logged',
  website_generated: 'Website generated',
  preview_sent: 'Preview sent',
  proposal_sent: 'Proposal sent',
};

export function isLeadActivityType(value: string): value is LeadActivityType {
  return (LEAD_ACTIVITY_TYPES as readonly string[]).includes(value);
}

// `detail` is an untyped `Record<string, unknown> | null` on the backend
// (e.g. `{from: 'new', to: 'qualified'}` for `stage_changed`) — rendered
// only when it actually has a plain `from`/`to` string pair, never
// stringified wholesale.
export function describeActivityDetail(detail: Record<string, unknown> | null): string | null {
  if (!detail) {
    return null;
  }
  const { from, to } = detail;
  if (typeof from === 'string' && typeof to === 'string') {
    return `${from} → ${to}`;
  }
  return null;
}

// The 5 categories the F10 brief explicitly asks for: Calls/Meetings/
// Emails/WhatsApp map 1:1 to real `LeadActivityType` values; "Notes" is
// not an activity type at all — it's the separate `LeadNote` entity
// (`GET /leads/:id/notes`, M4), deliberately never merged into this list
// (DECISIONS.md D-180).
export const ACTIVITY_CATEGORY_TYPES: Record<
  'call' | 'email' | 'meeting' | 'whatsapp',
  LeadActivityType
> = {
  call: 'call',
  email: 'email',
  meeting: 'meeting',
  whatsapp: 'whatsapp',
};
