import { BusinessSourceProvider, WebsiteDetectionMethod, WebsiteStatusType } from '@riznexia/db';
import type { PrismaClient } from '@riznexia/db';
import { BusinessService } from './business.service';

function fakeBusiness(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'biz-1',
    googlePlaceId: 'place_1',
    businessName: "Joe's Diner",
    category: 'restaurant',
    city: 'Karachi',
    address: '123 Main St',
    placesData: {},
    websiteStatus: WebsiteStatusType.NONE,
    discoveryJobId: 'job-1',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    deletedAt: null,
    ...overrides,
  };
}

describe('BusinessService', () => {
  let prisma: {
    business: { findUnique: jest.Mock; upsert: jest.Mock };
  };
  let service: BusinessService;

  beforeEach(() => {
    prisma = {
      business: { findUnique: jest.fn(), upsert: jest.fn() },
    };
    service = new BusinessService(prisma as unknown as PrismaClient);
  });

  describe('findByPlaceId', () => {
    it('returns the business when found', async () => {
      prisma.business.findUnique.mockResolvedValue(fakeBusiness());
      const result = await service.findByPlaceId('place_1');
      expect(result).toMatchObject({ id: 'biz-1' });
      expect(prisma.business.findUnique).toHaveBeenCalledWith({
        where: { googlePlaceId: 'place_1' },
      });
    });

    it('returns null when no business exists for that place id', async () => {
      prisma.business.findUnique.mockResolvedValue(null);
      await expect(service.findByPlaceId('place_unknown')).resolves.toBeNull();
    });
  });

  describe('findById', () => {
    it('returns null when not found', async () => {
      prisma.business.findUnique.mockResolvedValue(null);
      await expect(service.findById('missing')).resolves.toBeNull();
    });

    it('returns the business when found', async () => {
      prisma.business.findUnique.mockResolvedValue(fakeBusiness());
      await expect(service.findById('biz-1')).resolves.toMatchObject({ id: 'biz-1' });
    });
  });

  describe('upsertByPlaceId', () => {
    const input = {
      googlePlaceId: 'place_1',
      businessName: "Joe's Diner",
      category: 'restaurant',
      city: 'Karachi',
      address: '123 Main St',
      placesData: {},
      websiteStatus: WebsiteStatusType.OUTDATED,
      discoveryJobId: 'job-2',
    };

    it('reports wasNew true when no business previously existed', async () => {
      prisma.business.findUnique.mockResolvedValue(null);
      prisma.business.upsert.mockResolvedValue(fakeBusiness({ id: 'biz-new' }));
      const result = await service.upsertByPlaceId(input);
      expect(result).toEqual({ id: 'biz-new', wasNew: true });
    });

    it('reports wasNew false when a business already existed', async () => {
      prisma.business.findUnique.mockResolvedValue(fakeBusiness());
      prisma.business.upsert.mockResolvedValue(fakeBusiness());
      const result = await service.upsertByPlaceId(input);
      expect(result.wasNew).toBe(false);
    });

    it('refreshes every business-data field on the update path', async () => {
      prisma.business.findUnique.mockResolvedValue(fakeBusiness());
      prisma.business.upsert.mockResolvedValue(fakeBusiness());

      await service.upsertByPlaceId(input);

      const [args] = prisma.business.upsert.mock.calls[0] as [{ update: Record<string, unknown> }];
      expect(args.update).toMatchObject({
        businessName: "Joe's Diner",
        websiteStatus: WebsiteStatusType.OUTDATED,
        discoveryJobId: 'job-2',
      });
      expect(args.update).not.toHaveProperty('deletedAt');
    });

    it('dedupes on googlePlaceId, not on any other field', async () => {
      prisma.business.findUnique.mockResolvedValue(null);
      prisma.business.upsert.mockResolvedValue(fakeBusiness());

      await service.upsertByPlaceId(input);

      const [args] = prisma.business.upsert.mock.calls[0] as [{ where: Record<string, unknown> }];
      expect(args.where).toEqual({ googlePlaceId: 'place_1' });
    });

    // Module M5 (DECISIONS.md D-033+)
    it('starts syncVersion at 1 (schema default) on create and atomically increments it on update', async () => {
      prisma.business.findUnique.mockResolvedValue(null);
      prisma.business.upsert.mockResolvedValue(fakeBusiness({ id: 'biz-new' }));

      await service.upsertByPlaceId(input);

      const [args] = prisma.business.upsert.mock.calls[0] as [
        { create: Record<string, unknown>; update: Record<string, unknown> },
      ];
      expect(args.create).not.toHaveProperty('syncVersion'); // omitted -> schema @default(1) applies
      expect(args.update.syncVersion).toEqual({ increment: 1 });
    });

    it('defaults sourceProvider to GOOGLE when the caller does not specify one', async () => {
      prisma.business.findUnique.mockResolvedValue(null);
      prisma.business.upsert.mockResolvedValue(fakeBusiness());

      await service.upsertByPlaceId(input);

      const [args] = prisma.business.upsert.mock.calls[0] as [
        { create: Record<string, unknown>; update: Record<string, unknown> },
      ];
      expect(args.create.sourceProvider).toBe(BusinessSourceProvider.GOOGLE);
      expect(args.update.sourceProvider).toBe(BusinessSourceProvider.GOOGLE);
    });

    it('stamps lastSyncedAt and websiteDetectedAt on both create and update', async () => {
      prisma.business.findUnique.mockResolvedValue(null);
      prisma.business.upsert.mockResolvedValue(fakeBusiness());

      await service.upsertByPlaceId(input);

      const [args] = prisma.business.upsert.mock.calls[0] as [
        { create: Record<string, unknown>; update: Record<string, unknown> },
      ];
      expect(args.create.lastSyncedAt).toBeInstanceOf(Date);
      expect(args.create.websiteDetectedAt).toBeInstanceOf(Date);
      expect(args.update.lastSyncedAt).toBeInstanceOf(Date);
      expect(args.update.websiteDetectedAt).toBeInstanceOf(Date);
    });

    it('passes through the M5 extension fields (lat/lng/phone/rating/etc) when provided', async () => {
      prisma.business.findUnique.mockResolvedValue(null);
      prisma.business.upsert.mockResolvedValue(fakeBusiness());

      await service.upsertByPlaceId({
        ...input,
        latitude: 24.86,
        longitude: 67.01,
        phone: '+92 300 1234567',
        rating: 4.5,
        reviewCount: 120,
        googleBusinessUrl: 'https://maps.google.com/?cid=1',
        websiteDetectionMethod: WebsiteDetectionMethod.HEURISTIC_SCAN,
        sourceProvider: BusinessSourceProvider.GOOGLE,
        lastSyncJobId: 'sync-job-1',
      });

      const [args] = prisma.business.upsert.mock.calls[0] as [{ update: Record<string, unknown> }];
      expect(args.update).toMatchObject({
        latitude: 24.86,
        longitude: 67.01,
        phone: '+92 300 1234567',
        rating: 4.5,
        reviewCount: 120,
        googleBusinessUrl: 'https://maps.google.com/?cid=1',
        websiteDetectionMethod: WebsiteDetectionMethod.HEURISTIC_SCAN,
        lastSyncJobId: 'sync-job-1',
      });
    });

    it('omits lastSyncJobId (leaves it untouched) when the caller does not provide one, e.g. M1 discovery writes', async () => {
      prisma.business.findUnique.mockResolvedValue(fakeBusiness());
      prisma.business.upsert.mockResolvedValue(fakeBusiness());

      await service.upsertByPlaceId(input); // input has no lastSyncJobId (M1-style call)

      const [args] = prisma.business.upsert.mock.calls[0] as [{ update: Record<string, unknown> }];
      expect(args.update.lastSyncJobId).toBeUndefined();
    });
  });
});
