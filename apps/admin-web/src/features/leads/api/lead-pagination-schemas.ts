import { leadActivitySchema, leadNoteSchema, leadSchema } from '@riznexia/shared-types';
import { z } from 'zod';

// `packages/shared-types/src/lead.ts` exports `Lead`/`LeadNote`/
// `LeadActivity` item schemas but not their paginated envelope shapes —
// those exist only as backend-local TypeScript interfaces
// (`PaginatedLeads`/`PaginatedLeadNotes`/`PaginatedLeadActivity` in
// apps/api/src/leads/*.service.ts), each `{items: T[], nextCursor: string
// | null}`. Defined once here, locally, for this feature's dev-only
// response-schema drift checks — not invented, just not exported upstream.
export const paginatedLeadsSchema = z.object({
  items: z.array(leadSchema),
  nextCursor: z.string().nullable(),
});

export const paginatedLeadNotesSchema = z.object({
  items: z.array(leadNoteSchema),
  nextCursor: z.string().nullable(),
});

export const paginatedLeadActivitySchema = z.object({
  items: z.array(leadActivitySchema),
  nextCursor: z.string().nullable(),
});
