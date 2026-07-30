import { WebsiteStatusType as PrismaWebsiteStatus } from '@riznexia/db';
import type { WebsiteStatus } from '@riznexia/shared-types';

// Same Prisma-uppercase / API-lowercase split as auth/team-member.mapper.ts
// and leads/lead.mapper.ts. Lives here (not leads/lead.mapper.ts) because
// websiteStatus is a Business-owned field as of Module M2 — see the
// Business/Lead split in packages/db/prisma/schema.prisma.
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

export function toApiWebsiteStatus(status: PrismaWebsiteStatus): WebsiteStatus {
  return PRISMA_TO_API_WEBSITE_STATUS[status];
}

export function toPrismaWebsiteStatus(status: WebsiteStatus): PrismaWebsiteStatus {
  return API_TO_PRISMA_WEBSITE_STATUS[status];
}
