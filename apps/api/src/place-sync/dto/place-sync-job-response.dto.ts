import {
  BusinessSourceProvider as PrismaSourceProvider,
  PlaceSyncJobStatus as PrismaPlaceSyncJobStatus,
} from '@riznexia/db';
import type { PlaceSyncJob as PlaceSyncJobModel } from '@riznexia/db';
import type {
  LocationSourceProvider,
  PlaceSyncJob as PlaceSyncJobResponse,
  PlaceSyncJobStatus,
} from '@riznexia/shared-types';

const PRISMA_TO_API_STATUS: Record<PrismaPlaceSyncJobStatus, PlaceSyncJobStatus> = {
  [PrismaPlaceSyncJobStatus.QUEUED]: 'queued',
  [PrismaPlaceSyncJobStatus.RUNNING]: 'running',
  [PrismaPlaceSyncJobStatus.COMPLETED]: 'completed',
  [PrismaPlaceSyncJobStatus.FAILED]: 'failed',
  [PrismaPlaceSyncJobStatus.PARTIAL]: 'partial',
};

// Same Prisma-uppercase / API-lowercase split used throughout (e.g.
// discovery-job-response.dto.ts) — reused here for BusinessSourceProvider
// since PlaceSyncJob.provider shares that enum with Business.sourceProvider.
const PRISMA_TO_API_PROVIDER: Record<PrismaSourceProvider, LocationSourceProvider> = {
  [PrismaSourceProvider.GOOGLE]: 'google',
  [PrismaSourceProvider.YELP]: 'yelp',
  [PrismaSourceProvider.FACEBOOK]: 'facebook',
  [PrismaSourceProvider.FOURSQUARE]: 'foursquare',
  [PrismaSourceProvider.CSV_IMPORT]: 'csv_import',
};

export function toPlaceSyncJobResponse(job: PlaceSyncJobModel): PlaceSyncJobResponse {
  return {
    id: job.id,
    provider: PRISMA_TO_API_PROVIDER[job.provider],
    city: job.city,
    category: job.category,
    keyword: job.keyword,
    latitude: job.latitude === null ? null : Number(job.latitude),
    longitude: job.longitude === null ? null : Number(job.longitude),
    radiusMeters: job.radiusMeters,
    status: PRISMA_TO_API_STATUS[job.status],
    startedAt: job.startedAt === null ? null : job.startedAt.toISOString(),
    finishedAt: job.finishedAt === null ? null : job.finishedAt.toISOString(),
    duration: job.duration,
    successRate: job.successRate,
    apiCallsUsed: job.apiCallsUsed,
    estimatedCost: Number(job.estimatedCost),
    businessesFound: job.businessesFound,
    businessesCreated: job.businessesCreated,
    businessesUpdated: job.businessesUpdated,
    businessesFailed: job.businessesFailed,
    errorMessage: job.errorMessage,
  };
}
