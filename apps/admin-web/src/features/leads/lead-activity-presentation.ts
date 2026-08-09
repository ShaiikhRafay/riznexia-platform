import { LEAD_ACTIVITY_TYPES, type LeadActivityType } from '@riznexia/shared-types';

// Activity Timeline (F4 scope): a label per `LeadActivityType` — the same
// closed enum the backend's `lead_activities` table uses (call/email/
// meeting/whatsapp/website_generated/preview_sent/proposal_sent are
// written by the CRM module, M10, but can appear on a lead's timeline
// since it's a shared enum/table — this screen renders whatever it's
// given, it doesn't filter by which module wrote it).
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
// stringified wholesale, since its shape isn't part of any documented
// contract this frontend can rely on beyond that one common case.
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
