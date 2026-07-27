import { DiscoveryJobStatus as PrismaDiscoveryJobStatus } from '@riznexia/db';
import type { DiscoveryJob as DiscoveryJobModel } from '@riznexia/db';
import type {
  DiscoveryJob as DiscoveryJobResponse,
  DiscoveryJobStatus,
} from '@riznexia/shared-types';

const PRISMA_TO_API_STATUS: Record<PrismaDiscoveryJobStatus, DiscoveryJobStatus> = {
  [PrismaDiscoveryJobStatus.QUEUED]: 'queued',
  [PrismaDiscoveryJobStatus.RUNNING]: 'running',
  [PrismaDiscoveryJobStatus.COMPLETED]: 'completed',
  [PrismaDiscoveryJobStatus.FAILED]: 'failed',
};

export function toDiscoveryJobResponse(job: DiscoveryJobModel): DiscoveryJobResponse {
  return {
    id: job.id,
    city: job.city,
    category: job.category,
    status: PRISMA_TO_API_STATUS[job.status],
    resultsCount: job.resultsCount,
  };
}
