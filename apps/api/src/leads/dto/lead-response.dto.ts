import type { Business, Lead as LeadModel } from '@riznexia/db';
import type { Lead as LeadResponse } from '@riznexia/shared-types';
import { toApiWebsiteStatus } from '../../business/business.mapper';
import { toApiPipelineStage } from '../lead.mapper';

export type LeadWithBusiness = LeadModel & { business: Business };

// Maps the joined Prisma rows to the exact flat response shape from
// docs/19-api-architecture.md §5 — never returns placesData, googlePlaceId,
// discoveryJobId, or deletedAt, none of which are part of the documented
// contract (placesData in particular is the raw Places payload, an
// internal input to Module M3's analysis, not a public API field). The
// public contract is unchanged by Module M2's Business/Lead split — this
// function is the only place that now has to know the data lives in two
// tables (LeadsService always queries with `include: { business: true }`).
//
// Module M4: `notes` dropped from this shape (moved to its own resource,
// `GET /leads/:id/notes`, DECISIONS.md D-030); `businessId`, `tags`, and
// `updatedAt` added.
export function toLeadResponse(lead: LeadWithBusiness): LeadResponse {
  return {
    id: lead.id,
    businessId: lead.businessId,
    businessName: lead.business.businessName,
    category: lead.business.category,
    city: lead.business.city,
    address: lead.business.address,
    websiteStatus: toApiWebsiteStatus(lead.business.websiteStatus),
    pipelineStage: toApiPipelineStage(lead.pipelineStage),
    assignedTo: lead.assignedToId,
    tags: lead.tags,
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
  };
}
