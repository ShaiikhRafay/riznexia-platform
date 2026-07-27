import { z } from 'zod';

// Matches docs/19-api-architecture.md §5 `DiscoveryJob` schema and the
// discovery_job_status Prisma enum (Doc 18), lowercase per the API contract
// (same Prisma-uppercase / API-lowercase split as team-member.ts).
export const DISCOVERY_JOB_STATUSES = ['queued', 'running', 'completed', 'failed'] as const;
export type DiscoveryJobStatus = (typeof DISCOVERY_JOB_STATUSES)[number];

export const discoveryJobSchema = z.object({
  id: z.string().uuid(),
  city: z.string(),
  category: z.string(),
  status: z.enum(DISCOVERY_JOB_STATUSES),
  resultsCount: z.number().int().nonnegative(),
});
export type DiscoveryJob = z.infer<typeof discoveryJobSchema>;

// POST /discovery-jobs request body (Doc 19 §5). Accepts multiple
// categories per request for rep convenience; the service fans this out
// into one discovery_job per category (Doc 18's discovery_job.category is
// a single column, one row per city+category pair) — see DECISIONS.md.
export const createDiscoveryJobSchema = z.object({
  city: z.string().min(1).max(100),
  categories: z.array(z.string().min(1).max(50)).min(1).max(5),
  radiusKm: z.number().positive().max(50).default(15),
});
export type CreateDiscoveryJobInput = z.infer<typeof createDiscoveryJobSchema>;
