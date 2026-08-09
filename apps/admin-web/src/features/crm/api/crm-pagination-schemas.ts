import { crmTaskSchema, salesProposalSchema } from '@riznexia/shared-types';
import { z } from 'zod';

// Same local-only paginated-envelope convention as F4's
// `lead-pagination-schemas.ts` — `packages/shared-types` exports the item
// schemas but not their `{items, nextCursor}` wrapper shapes, since those
// only exist as backend-local TypeScript interfaces.
export const paginatedCrmTasksSchema = z.object({
  items: z.array(crmTaskSchema),
  nextCursor: z.string().nullable(),
});

export const paginatedSalesProposalsSchema = z.object({
  items: z.array(salesProposalSchema),
  nextCursor: z.string().nullable(),
});
