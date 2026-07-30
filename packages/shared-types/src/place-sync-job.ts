import { z } from 'zod';

// Matches docs/19-api-architecture.md §5's PlaceSyncJob schema (Module M5)
// and the place_sync_job_status Prisma enum (Doc 18), lowercase per the API
// contract — same Prisma-uppercase / API-lowercase split as DiscoveryJob.
export const PLACE_SYNC_JOB_STATUSES = [
  'queued',
  'running',
  'completed',
  'failed',
  'partial',
] as const;
export type PlaceSyncJobStatus = (typeof PLACE_SYNC_JOB_STATUSES)[number];

// Every provider named in the M5 brief (Yelp/Facebook/Foursquare/CSV
// Import), not just the one implemented today — mirrors the
// BusinessSourceProvider Prisma enum's forward-declaration rationale.
export const LOCATION_SOURCE_PROVIDERS = [
  'google',
  'yelp',
  'facebook',
  'foursquare',
  'csv_import',
] as const;
export type LocationSourceProvider = (typeof LOCATION_SOURCE_PROVIDERS)[number];

export const placeSyncJobSchema = z.object({
  id: z.string().uuid(),
  provider: z.enum(LOCATION_SOURCE_PROVIDERS),
  city: z.string().nullable(),
  category: z.string().nullable(),
  keyword: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  radiusMeters: z.number().int().nullable(),
  status: z.enum(PLACE_SYNC_JOB_STATUSES),
  startedAt: z.string().nullable(),
  finishedAt: z.string().nullable(),
  duration: z.number().int().nullable(),
  successRate: z.number().nullable(),
  apiCallsUsed: z.number().int().nonnegative(),
  estimatedCost: z.number().nonnegative(),
  businessesFound: z.number().int().nonnegative(),
  businessesCreated: z.number().int().nonnegative(),
  businessesUpdated: z.number().int().nonnegative(),
  businessesFailed: z.number().int().nonnegative(),
  errorMessage: z.string().nullable(),
});
export type PlaceSyncJob = z.infer<typeof placeSyncJobSchema>;

// POST /place-sync-jobs request body (Doc 19 §5). Either `city` (text
// search, optionally narrowed by `category`/`keyword`) or
// `latitude`+`longitude` (nearby search) must be provided — the same fork
// LocationProvider.search() itself makes (apps/api/src/common/providers/).
export const createPlaceSyncJobSchema = z
  .object({
    city: z.string().trim().min(1).max(100).optional(),
    category: z.string().trim().min(1).max(50).optional(),
    keyword: z.string().trim().min(1).max(100).optional(),
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
    radiusMeters: z.number().positive().max(50_000).default(15_000),
  })
  .superRefine((data, ctx) => {
    const hasCoordinates = data.latitude !== undefined && data.longitude !== undefined;
    const hasOnlyOneCoordinate = (data.latitude !== undefined) !== (data.longitude !== undefined);

    if (hasOnlyOneCoordinate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'latitude and longitude must be provided together',
      });
      return;
    }

    if (!data.city && !hasCoordinates) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Either city or latitude+longitude must be provided',
      });
      return;
    }

    if (!hasCoordinates && data.city && !data.category && !data.keyword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'A city search requires category or keyword',
      });
    }
  });
export type CreatePlaceSyncJobInput = z.infer<typeof createPlaceSyncJobSchema>;
