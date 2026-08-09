import { z } from 'zod';
import { AGGREGATION_PERIODS } from './analytics-aggregation';

// Module M12 (DECISIONS.md D-109) — founder's explicit Decision 7: CSV is
// actually implemented; `pdf`/`excel` are reserved values a client can
// request but that reject with `EXPORT_FORMAT_NOT_IMPLEMENTED` — the enum
// carries all three so the API contract never has to change shape when a
// future module implements the other two, only which values succeed.
export const EXPORT_FORMATS = ['csv', 'pdf', 'excel'] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export const exportQuerySchema = z.object({
  format: z.enum(EXPORT_FORMATS),
  period: z.enum(AGGREGATION_PERIODS).default('monthly'),
  fromDate: z.string().datetime().optional(),
  toDate: z.string().datetime().optional(),
});
export type ExportQuery = z.infer<typeof exportQuerySchema>;
