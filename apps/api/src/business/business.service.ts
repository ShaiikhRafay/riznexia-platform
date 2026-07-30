import { Inject, Injectable } from '@nestjs/common';
import { BusinessSourceProvider } from '@riznexia/db';
import type { Business, Prisma, PrismaClient } from '@riznexia/db';
import type { WebsiteStatusType as PrismaWebsiteStatus } from '@riznexia/db';
import type {
  BusinessOperatingStatus as PrismaBusinessOperatingStatus,
  WebsiteDetectionMethod as PrismaWebsiteDetectionMethod,
} from '@riznexia/db';
import { PRISMA_CLIENT } from '../common/database/database.constants';

export interface UpsertBusinessInput {
  googlePlaceId: string;
  businessName: string;
  category: string;
  city: string;
  address: string;
  placesData: Prisma.InputJsonValue;
  websiteStatus: PrismaWebsiteStatus;
  // Module M1: set by DiscoveryRunnerService. Module M5: left undefined by
  // PlaceSyncRunnerService, which sets lastSyncJobId instead — a Business
  // can be discovered by M1 or synced by M5, never both at once.
  discoveryJobId?: string | null;

  // Module M5 (DECISIONS.md D-033+) — all optional so M1's
  // DiscoveryRunnerService (which never fetches these) needs no change to
  // keep upserting successfully; only PlaceSyncRunnerService populates them.
  latitude?: number | null;
  longitude?: number | null;
  phone?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  openingHours?: Prisma.InputJsonValue;
  photos?: Prisma.InputJsonValue;
  businessStatus?: PrismaBusinessOperatingStatus;
  googleBusinessUrl?: string | null;
  websiteDetectionMethod?: PrismaWebsiteDetectionMethod;
  sourceProvider?: BusinessSourceProvider;
  lastSyncJobId?: string | null;
}

export interface UpsertBusinessResult {
  id: string;
  wasNew: boolean;
}

// Doc 16 §3 — Discovery Context owns `business`: the raw, dedupe-by-place
// record of a real-world business and what we know about its web presence.
// Module M2 split this out of `Lead` (see the Business model's doc comment
// in packages/db/prisma/schema.prisma) — DiscoveryRunnerService (Module M1)
// and PlaceSyncRunnerService (Module M5) are both callers today; LeadsService
// reads business data via a Prisma `include` rather than going through this
// service (Doc 16 §3, no cross-service read-through needed for a
// same-transaction join).
@Injectable()
export class BusinessService {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  async findByPlaceId(googlePlaceId: string): Promise<Business | null> {
    return this.prisma.business.findUnique({ where: { googlePlaceId } });
  }

  async findById(id: string): Promise<Business | null> {
    return this.prisma.business.findUnique({ where: { id } });
  }

  /**
   * Dedupe-by-google_place_id (Doc 18 §5, FR-1.5). On a repeat
   * discovery/sync, every business-data field refreshes (FR-1.7) — there is
   * no pipeline state on this table to preserve; that lives entirely on
   * `Lead` now, and this method never touches it. `lastSyncedAt` and
   * `websiteDetectedAt` are stamped unconditionally on every call (both
   * create and update) — every upsert is itself a sync event — and
   * `syncVersion` starts at 1 on create, atomically incremented on update.
   */
  async upsertByPlaceId(input: UpsertBusinessInput): Promise<UpsertBusinessResult> {
    const existing = await this.prisma.business.findUnique({
      where: { googlePlaceId: input.googlePlaceId },
    });

    const now = new Date();
    const sourceProvider = input.sourceProvider ?? BusinessSourceProvider.GOOGLE;

    const business = await this.prisma.business.upsert({
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
        latitude: input.latitude,
        longitude: input.longitude,
        phone: input.phone,
        rating: input.rating,
        reviewCount: input.reviewCount,
        openingHours: input.openingHours,
        photos: input.photos,
        businessStatus: input.businessStatus,
        googleBusinessUrl: input.googleBusinessUrl,
        websiteDetectionMethod: input.websiteDetectionMethod,
        websiteDetectedAt: now,
        sourceProvider,
        lastSyncedAt: now,
        lastSyncJobId: input.lastSyncJobId,
      },
      update: {
        businessName: input.businessName,
        category: input.category,
        city: input.city,
        address: input.address,
        placesData: input.placesData,
        websiteStatus: input.websiteStatus,
        discoveryJobId: input.discoveryJobId,
        latitude: input.latitude,
        longitude: input.longitude,
        phone: input.phone,
        rating: input.rating,
        reviewCount: input.reviewCount,
        openingHours: input.openingHours,
        photos: input.photos,
        businessStatus: input.businessStatus,
        googleBusinessUrl: input.googleBusinessUrl,
        websiteDetectionMethod: input.websiteDetectionMethod,
        websiteDetectedAt: now,
        sourceProvider,
        lastSyncedAt: now,
        lastSyncJobId: input.lastSyncJobId,
        syncVersion: { increment: 1 },
      },
    });

    return { id: business.id, wasNew: !existing };
  }
}
