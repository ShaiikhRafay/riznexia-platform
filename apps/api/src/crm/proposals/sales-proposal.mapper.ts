import { ProposalStatus as PrismaProposalStatus } from '@riznexia/db';
import type { ProposalStatus } from '@riznexia/shared-types';

// Same Prisma-uppercase / API-lowercase split as leads/lead.mapper.ts.
// `EDITED` has no API-lowercase counterpart producible by this module
// (DECISIONS.md D-085 — immutable version history means "editing" never
// transitions a row) but is mapped anyway so this Record stays total
// over the Prisma enum, matching every other mapper in this codebase.
const PRISMA_TO_API: Record<PrismaProposalStatus, ProposalStatus> = {
  [PrismaProposalStatus.DRAFT]: 'draft',
  [PrismaProposalStatus.EDITED]: 'edited',
  [PrismaProposalStatus.SENT_MANUALLY]: 'sent_manually',
  [PrismaProposalStatus.VIEWED]: 'viewed',
  [PrismaProposalStatus.ACCEPTED]: 'accepted',
  [PrismaProposalStatus.REJECTED]: 'rejected',
};

const API_TO_PRISMA: Record<ProposalStatus, PrismaProposalStatus> = {
  draft: PrismaProposalStatus.DRAFT,
  edited: PrismaProposalStatus.EDITED,
  sent_manually: PrismaProposalStatus.SENT_MANUALLY,
  viewed: PrismaProposalStatus.VIEWED,
  accepted: PrismaProposalStatus.ACCEPTED,
  rejected: PrismaProposalStatus.REJECTED,
};

export function toApiProposalStatus(status: PrismaProposalStatus): ProposalStatus {
  return PRISMA_TO_API[status];
}

export function toPrismaProposalStatus(status: ProposalStatus): PrismaProposalStatus {
  return API_TO_PRISMA[status];
}
