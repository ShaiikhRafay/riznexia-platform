import type { SalesProposal as SalesProposalModel } from '@riznexia/db';
import type { SalesProposal } from '@riznexia/shared-types';
import { toApiProposalStatus } from '../sales-proposal.mapper';

export function toSalesProposalResponse(proposal: SalesProposalModel): SalesProposal {
  return {
    id: proposal.id,
    leadId: proposal.leadId,
    version: proposal.version,
    content: proposal.content,
    status: toApiProposalStatus(proposal.status),
    sentAt: proposal.sentAt?.toISOString() ?? null,
    viewedAt: proposal.viewedAt?.toISOString() ?? null,
    acceptedAt: proposal.acceptedAt?.toISOString() ?? null,
    rejectedAt: proposal.rejectedAt?.toISOString() ?? null,
    createdById: proposal.createdById,
    createdAt: proposal.createdAt.toISOString(),
    updatedAt: proposal.updatedAt.toISOString(),
  };
}
