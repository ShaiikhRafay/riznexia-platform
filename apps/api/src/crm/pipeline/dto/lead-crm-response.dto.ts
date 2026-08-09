import type { LeadCRM as LeadCrmModel } from '@riznexia/db';
import type { LeadCRM } from '@riznexia/shared-types';

export function toLeadCrmResponse(leadCrm: LeadCrmModel): LeadCRM {
  return {
    id: leadCrm.id,
    leadId: leadCrm.leadId,
    stageId: leadCrm.stageId,
    dealValueUsd: leadCrm.dealValueUsd === null ? null : Number(leadCrm.dealValueUsd),
    lostReasonId: leadCrm.lostReasonId,
    ownerId: leadCrm.ownerId,
    nextFollowUpAt: leadCrm.nextFollowUpAt?.toISOString() ?? null,
    lastActivityAt: leadCrm.lastActivityAt?.toISOString() ?? null,
    createdAt: leadCrm.createdAt.toISOString(),
    updatedAt: leadCrm.updatedAt.toISOString(),
  };
}
