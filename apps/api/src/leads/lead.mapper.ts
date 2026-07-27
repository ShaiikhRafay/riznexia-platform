import {
  PipelineStage as PrismaPipelineStage,
  WebsiteStatusType as PrismaWebsiteStatus,
} from '@riznexia/db';
import type { PipelineStage, WebsiteStatus } from '@riznexia/shared-types';

// Same Prisma-uppercase / API-lowercase split as auth/team-member.mapper.ts.
const PRISMA_TO_API_WEBSITE_STATUS: Record<PrismaWebsiteStatus, WebsiteStatus> = {
  [PrismaWebsiteStatus.NONE]: 'none',
  [PrismaWebsiteStatus.OUTDATED]: 'outdated',
  [PrismaWebsiteStatus.PRESENT]: 'present',
};

const API_TO_PRISMA_WEBSITE_STATUS: Record<WebsiteStatus, PrismaWebsiteStatus> = {
  none: PrismaWebsiteStatus.NONE,
  outdated: PrismaWebsiteStatus.OUTDATED,
  present: PrismaWebsiteStatus.PRESENT,
};

const PRISMA_TO_API_PIPELINE_STAGE: Record<PrismaPipelineStage, PipelineStage> = {
  [PrismaPipelineStage.NEW]: 'new',
  [PrismaPipelineStage.QUALIFIED]: 'qualified',
  [PrismaPipelineStage.CONTACTED]: 'contacted',
  [PrismaPipelineStage.IN_DISCUSSION]: 'in_discussion',
  [PrismaPipelineStage.WON]: 'won',
  [PrismaPipelineStage.LOST]: 'lost',
};

const API_TO_PRISMA_PIPELINE_STAGE: Record<PipelineStage, PrismaPipelineStage> = {
  new: PrismaPipelineStage.NEW,
  qualified: PrismaPipelineStage.QUALIFIED,
  contacted: PrismaPipelineStage.CONTACTED,
  in_discussion: PrismaPipelineStage.IN_DISCUSSION,
  won: PrismaPipelineStage.WON,
  lost: PrismaPipelineStage.LOST,
};

export function toApiWebsiteStatus(status: PrismaWebsiteStatus): WebsiteStatus {
  return PRISMA_TO_API_WEBSITE_STATUS[status];
}

export function toPrismaWebsiteStatus(status: WebsiteStatus): PrismaWebsiteStatus {
  return API_TO_PRISMA_WEBSITE_STATUS[status];
}

export function toApiPipelineStage(stage: PrismaPipelineStage): PipelineStage {
  return PRISMA_TO_API_PIPELINE_STAGE[stage];
}

export function toPrismaPipelineStage(stage: PipelineStage): PrismaPipelineStage {
  return API_TO_PRISMA_PIPELINE_STAGE[stage];
}
