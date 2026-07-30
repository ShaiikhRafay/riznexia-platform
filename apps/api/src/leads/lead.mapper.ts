import { PipelineStage as PrismaPipelineStage } from '@riznexia/db';
import type { PipelineStage } from '@riznexia/shared-types';

// Same Prisma-uppercase / API-lowercase split as auth/team-member.mapper.ts.
// websiteStatus's mapper lives in business/business.mapper.ts as of Module
// M2 — it's a Business-owned field now, not a Lead-owned one.
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

export function toApiPipelineStage(stage: PrismaPipelineStage): PipelineStage {
  return PRISMA_TO_API_PIPELINE_STAGE[stage];
}

export function toPrismaPipelineStage(stage: PipelineStage): PrismaPipelineStage {
  return API_TO_PRISMA_PIPELINE_STAGE[stage];
}
