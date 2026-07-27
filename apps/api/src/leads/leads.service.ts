import { Inject, Injectable } from '@nestjs/common';
import type { Prisma, PrismaClient } from '@riznexia/db';
import { WebsiteStatusType as PrismaWebsiteStatus } from '@riznexia/db';
import type { Lead, ListLeadsQuery } from '@riznexia/shared-types';
import { PRISMA_CLIENT } from '../common/database/database.constants';
import { toLeadResponse } from './dto/lead-response.dto';
import { toPrismaPipelineStage } from './lead.mapper';

export interface PaginatedLeads {
  items: Lead[];
  nextCursor: string | null;
}

export interface UpsertLeadInput {
  googlePlaceId: string;
  businessName: string;
  category: string;
  city: string;
  address: string;
  placesData: Prisma.InputJsonValue;
  websiteStatus: PrismaWebsiteStatus;
  discoveryJobId: string;
}

export interface UpsertLeadResult {
  id: string;
  wasNew: boolean;
}

// Doc 16 §3 — Pipeline Context owns `lead`. Every write to this table goes
// through this service, including the discovery pipeline's writes
// (Doc 22 §14) — DiscoveryRunnerService never touches Prisma's `lead`
// model directly.
@Injectable()
export class LeadsService {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  async findMany(query: ListLeadsQuery): Promise<PaginatedLeads> {
    const where: Prisma.LeadWhereInput = {
      deletedAt: null,
      ...(query.stage && { pipelineStage: toPrismaPipelineStage(query.stage) }),
      ...(query.city && { city: query.city }),
      ...(query.category && { category: query.category }),
      ...(query.assignedTo && { assignedToId: query.assignedTo }),
      ...(query.q && { businessName: { contains: query.q, mode: 'insensitive' } }),
    };

    const rows = await this.prisma.lead.findMany({
      where,
      take: query.limit + 1,
      ...(query.cursor && { cursor: { id: query.cursor }, skip: 1 }),
      orderBy: { createdAt: 'desc' },
    });

    const hasMore = rows.length > query.limit;
    const page = hasMore ? rows.slice(0, query.limit) : rows;
    const last = page.at(-1);

    return {
      items: page.map(toLeadResponse),
      nextCursor: hasMore && last ? last.id : null,
    };
  }

  async findById(id: string): Promise<Lead | null> {
    const lead = await this.prisma.lead.findUnique({ where: { id, deletedAt: null } });
    return lead ? toLeadResponse(lead) : null;
  }

  /**
   * Used by the discovery pipeline to decide whether a candidate that now
   * classifies as `present` should still be written (refreshing an
   * already-tracked lead, FR-1.7) or discarded (a brand-new `present`
   * candidate is never persisted, FR-1.3).
   */
  async existsByPlaceId(googlePlaceId: string): Promise<boolean> {
    const lead = await this.prisma.lead.findUnique({
      where: { googlePlaceId },
      select: { id: true },
    });
    return lead !== null;
  }

  /**
   * Dedupe-by-google_place_id (Doc 18 §5, FR-1.5). On a repeat discovery,
   * business-data fields refresh (FR-1.7) but pipeline_stage, assignedToId,
   * and notes are deliberately left untouched — those are the rep's own
   * CRM progress (Module M2's domain), and rediscovering a business must
   * never silently reset it. A soft-deleted lead is also left alone rather
   * than being silently revived — see leads.service.spec.ts for both cases.
   */
  async upsertByPlaceId(input: UpsertLeadInput): Promise<UpsertLeadResult> {
    const existing = await this.prisma.lead.findUnique({
      where: { googlePlaceId: input.googlePlaceId },
    });

    const lead = await this.prisma.lead.upsert({
      where: { googlePlaceId: input.googlePlaceId },
      create: {
        googlePlaceId: input.googlePlaceId,
        businessName: input.businessName,
        category: input.category,
        city: input.city,
        address: input.address,
        placesData: input.placesData,
        websiteStatus: input.websiteStatus,
        discoveryJobId: input.discoveryJobId,
      },
      update: {
        businessName: input.businessName,
        category: input.category,
        city: input.city,
        address: input.address,
        placesData: input.placesData,
        websiteStatus: input.websiteStatus,
        discoveryJobId: input.discoveryJobId,
      },
    });

    return { id: lead.id, wasNew: !existing };
  }
}
