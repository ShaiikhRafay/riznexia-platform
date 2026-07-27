import { PipelineStage, WebsiteStatusType } from '@riznexia/db';
import type { PrismaClient } from '@riznexia/db';
import type { ListLeadsQuery } from '@riznexia/shared-types';
import { LeadsService } from './leads.service';

function fakeLead(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'lead-1',
    googlePlaceId: 'place_1',
    businessName: "Joe's Diner",
    category: 'restaurant',
    city: 'Karachi',
    address: '123 Main St',
    placesData: {},
    websiteStatus: WebsiteStatusType.NONE,
    pipelineStage: PipelineStage.NEW,
    assignedToId: null,
    discoveryJobId: 'job-1',
    notes: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    deletedAt: null,
    ...overrides,
  };
}

describe('LeadsService', () => {
  let prisma: {
    lead: { findMany: jest.Mock; findUnique: jest.Mock; upsert: jest.Mock };
  };
  let service: LeadsService;

  beforeEach(() => {
    prisma = {
      lead: { findMany: jest.fn(), findUnique: jest.fn(), upsert: jest.fn() },
    };
    service = new LeadsService(prisma as unknown as PrismaClient);
  });

  describe('existsByPlaceId', () => {
    it('returns true when a lead with that place id exists', async () => {
      prisma.lead.findUnique.mockResolvedValue({ id: 'lead-1' });
      await expect(service.existsByPlaceId('place_1')).resolves.toBe(true);
    });

    it('returns false when no lead exists', async () => {
      prisma.lead.findUnique.mockResolvedValue(null);
      await expect(service.existsByPlaceId('place_unknown')).resolves.toBe(false);
    });
  });

  describe('findMany', () => {
    const baseQuery: ListLeadsQuery = { limit: 25 };

    it('excludes soft-deleted rows by default', async () => {
      prisma.lead.findMany.mockResolvedValue([]);
      await service.findMany(baseQuery);
      const [args] = prisma.lead.findMany.mock.calls[0] as [{ where: { deletedAt: unknown } }];
      expect(args.where.deletedAt).toBeNull();
    });

    it('maps filters onto the Prisma where clause', async () => {
      prisma.lead.findMany.mockResolvedValue([]);
      await service.findMany({
        limit: 25,
        stage: 'qualified',
        city: 'Karachi',
        category: 'restaurant',
        assignedTo: 'rep-1',
        q: 'diner',
      });
      const [args] = prisma.lead.findMany.mock.calls[0] as [{ where: Record<string, unknown> }];
      expect(args.where).toMatchObject({
        pipelineStage: PipelineStage.QUALIFIED,
        city: 'Karachi',
        category: 'restaurant',
        assignedToId: 'rep-1',
        businessName: { contains: 'diner', mode: 'insensitive' },
      });
    });

    it('returns nextCursor null when results fit within the page limit', async () => {
      prisma.lead.findMany.mockResolvedValue([fakeLead()]);
      const result = await service.findMany({ ...baseQuery, limit: 25 });
      expect(result.nextCursor).toBeNull();
      expect(result.items).toHaveLength(1);
    });

    it('returns a nextCursor when more results exist than the page limit', async () => {
      prisma.lead.findMany.mockResolvedValue([
        fakeLead({ id: 'lead-1' }),
        fakeLead({ id: 'lead-2' }),
        fakeLead({ id: 'lead-3' }), // limit(2) + 1 lookahead row
      ]);
      const result = await service.findMany({ ...baseQuery, limit: 2 });
      expect(result.items).toHaveLength(2);
      expect(result.nextCursor).toBe('lead-2');
    });
  });

  describe('findById', () => {
    it('returns null when not found', async () => {
      prisma.lead.findUnique.mockResolvedValue(null);
      await expect(service.findById('missing')).resolves.toBeNull();
    });

    it('maps the Prisma row to the API response shape', async () => {
      prisma.lead.findUnique.mockResolvedValue(fakeLead());
      const result = await service.findById('lead-1');
      expect(result).toMatchObject({
        id: 'lead-1',
        businessName: "Joe's Diner",
        pipelineStage: 'new',
      });
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

    it('reports wasNew true when no lead previously existed', async () => {
      prisma.lead.findUnique.mockResolvedValue(null);
      prisma.lead.upsert.mockResolvedValue(fakeLead({ id: 'lead-new' }));
      const result = await service.upsertByPlaceId(input);
      expect(result).toEqual({ id: 'lead-new', wasNew: true });
    });

    it('reports wasNew false when a lead already existed', async () => {
      prisma.lead.findUnique.mockResolvedValue(fakeLead());
      prisma.lead.upsert.mockResolvedValue(fakeLead());
      const result = await service.upsertByPlaceId(input);
      expect(result.wasNew).toBe(false);
    });

    it('never includes pipelineStage, assignedToId, or notes in the update payload (CRM progress is untouched by rediscovery)', async () => {
      prisma.lead.findUnique.mockResolvedValue(fakeLead());
      prisma.lead.upsert.mockResolvedValue(fakeLead());

      await service.upsertByPlaceId(input);

      const [args] = prisma.lead.upsert.mock.calls[0] as [{ update: Record<string, unknown> }];
      expect(args.update).not.toHaveProperty('pipelineStage');
      expect(args.update).not.toHaveProperty('assignedToId');
      expect(args.update).not.toHaveProperty('notes');
      expect(args.update).not.toHaveProperty('deletedAt');
    });

    it('does refresh business-data fields on the update path', async () => {
      prisma.lead.findUnique.mockResolvedValue(fakeLead());
      prisma.lead.upsert.mockResolvedValue(fakeLead());

      await service.upsertByPlaceId(input);

      const [args] = prisma.lead.upsert.mock.calls[0] as [{ update: Record<string, unknown> }];
      expect(args.update).toMatchObject({
        businessName: "Joe's Diner",
        websiteStatus: WebsiteStatusType.OUTDATED,
        discoveryJobId: 'job-2',
      });
    });

    it('dedupes on googlePlaceId, not on any other field', async () => {
      prisma.lead.findUnique.mockResolvedValue(null);
      prisma.lead.upsert.mockResolvedValue(fakeLead());

      await service.upsertByPlaceId(input);

      const [args] = prisma.lead.upsert.mock.calls[0] as [{ where: Record<string, unknown> }];
      expect(args.where).toEqual({ googlePlaceId: 'place_1' });
    });
  });
});
