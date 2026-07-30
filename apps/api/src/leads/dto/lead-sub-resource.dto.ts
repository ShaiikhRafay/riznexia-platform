import type { LeadActivity as LeadActivityModel, LeadNote as LeadNoteModel } from '@riznexia/db';
import type { LeadActivity, LeadNote } from '@riznexia/shared-types';
import { toApiLeadActivityType } from '../lead-activity.mapper';

export function toLeadNoteResponse(note: LeadNoteModel): LeadNote {
  return {
    id: note.id,
    leadId: note.leadId,
    authorId: note.authorId,
    body: note.body,
    createdAt: note.createdAt.toISOString(),
  };
}

export function toLeadActivityResponse(activity: LeadActivityModel): LeadActivity {
  return {
    id: activity.id,
    leadId: activity.leadId,
    actorId: activity.actorId,
    type: toApiLeadActivityType(activity.type),
    // Prisma types a nullable Json column as `JsonValue | null`, which
    // includes primitives and arrays. Every write path in this module
    // stores an object or null (see LeadActivityService.record), so
    // anything else would mean hand-written data outside the service —
    // normalized to null rather than passed through as a shape the API
    // contract doesn't declare.
    detail: isPlainObject(activity.detail) ? activity.detail : null,
    createdAt: activity.createdAt.toISOString(),
  };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
