import type { Lead as LeadModel } from '@riznexia/db';
import type { Lead as LeadResponse } from '@riznexia/shared-types';
import { toApiPipelineStage, toApiWebsiteStatus } from '../lead.mapper';

// Maps the Prisma model to the exact response shape from
// docs/19-api-architecture.md §5 — never returns placesData, googlePlaceId,
// discoveryJobId, or deletedAt, none of which are part of the documented
// contract (placesData in particular is the raw Places payload, an
// internal input to Module M3's analysis, not a public API field).
export function toLeadResponse(lead: LeadModel): LeadResponse {
  return {
    id: lead.id,
    businessName: lead.businessName,
    category: lead.category,
    city: lead.city,
    address: lead.address,
    websiteStatus: toApiWebsiteStatus(lead.websiteStatus),
    pipelineStage: toApiPipelineStage(lead.pipelineStage),
    assignedTo: lead.assignedToId,
    notes: lead.notes,
    createdAt: lead.createdAt.toISOString(),
  };
}
