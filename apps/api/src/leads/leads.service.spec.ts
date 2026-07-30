import { LeadActivityType, PipelineStage, WebsiteStatusType } from '@riznexia/db';
import type { PrismaClient } from '@riznexia/db';
import type { ListLeadsQuery } from '@riznexia/shared-types';
import {
  BusinessNotFoundException,
  DuplicateLeadException,
  InvalidSortFieldException,
  LeadNotFoundException,
  TeamMemberNotFoundException,
} from '../common/exceptions/app.exception';
import type { BusinessService } from '../business/business.service';
import type { TeamMemberService } from '../auth/team-member.service';
import type { LeadActivityService } from './lead-activity.service';
import { LeadsService } from './leads.service';

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

function fakeLead(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'lead-1',
    businessId: 'biz-1',
    pipelineStage: PipelineStage.NEW,
    assignedToId: null,
    tags: [],
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    deletedAt: null,
    business: fakeBusiness(),
    ...overrides,
  };
}

describe('LeadsService', () => {
  let prisma: {
    lead: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let businessService: { findById: jest.Mock };
  let teamMemberService: { findById: jest.Mock };
  let activityService: { record: jest.Mock; recordMany: jest.Mock };
  let service: LeadsService;

  beforeEach(() => {
    prisma = {
      lead: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      // Callback-form transaction: hand the same mock back as `tx` so
      // assertions against e.g. `prisma.lead.create` still work.
      $transaction: jest.fn((callback: (tx: unknown) => unknown) => callback(prisma)),
    };
    businessService = { findById: jest.fn() };
    teamMemberService = { findById: jest.fn() };
    activityService = {
      record: jest.fn().mockResolvedValue(undefined),
      recordMany: jest.fn().mockResolvedValue(undefined),
    };
    service = new LeadsService(
      prisma as unknown as PrismaClient,
      businessService as unknown as BusinessService,
      teamMemberService as unknown as TeamMemberService,
      activityService as unknown as LeadActivityService,
    );
  });

  describe('findMany', () => {
    const baseQuery: ListLeadsQuery = { limit: 25 };

    it('always scopes the joined business to non-soft-deleted rows', async () => {
      prisma.lead.findMany.mockResolvedValue([]);
      await service.findMany(baseQuery);
      const [args] = prisma.lead.findMany.mock.calls[0] as [
        { where: { business: { deletedAt: unknown } } },
      ];
      expect(args.where.business.deletedAt).toBeNull();
    });

    it('always includes the joined business', async () => {
      prisma.lead.findMany.mockResolvedValue([]);
      await service.findMany(baseQuery);
      const [args] = prisma.lead.findMany.mock.calls[0] as [{ include: unknown }];
      expect(args.include).toEqual({ business: true });
    });

    it('maps lead-owned filters onto the top-level where clause', async () => {
      prisma.lead.findMany.mockResolvedValue([]);
      await service.findMany({ ...baseQuery, stage: 'qualified', assignedTo: 'rep-1', tag: 'vip' });
      const [args] = prisma.lead.findMany.mock.calls[0] as [{ where: Record<string, unknown> }];
      expect(args.where).toMatchObject({
        pipelineStage: PipelineStage.QUALIFIED,
        assignedToId: 'rep-1',
        tags: { has: 'vip' },
      });
    });

    it('maps business-owned filters onto the nested business where clause', async () => {
      prisma.lead.findMany.mockResolvedValue([]);
      await service.findMany({ ...baseQuery, city: 'Karachi', category: 'restaurant', q: 'diner' });
      const [args] = prisma.lead.findMany.mock.calls[0] as [
        { where: { business: Record<string, unknown> } },
      ];
      expect(args.where.business).toMatchObject({
        city: 'Karachi',
        category: 'restaurant',
        businessName: { contains: 'diner', mode: 'insensitive' },
      });
    });

    it('defaults sort to createdAt desc with id as a tiebreaker', async () => {
      prisma.lead.findMany.mockResolvedValue([]);
      await service.findMany(baseQuery);
      const [args] = prisma.lead.findMany.mock.calls[0] as [{ orderBy: unknown }];
      expect(args.orderBy).toEqual([{ createdAt: 'desc' }, { id: 'desc' }]);
    });

    it('parses a leading "-" as descending on a direct lead field', async () => {
      prisma.lead.findMany.mockResolvedValue([]);
      await service.findMany({ ...baseQuery, sort: '-updatedAt' });
      const [args] = prisma.lead.findMany.mock.calls[0] as [{ orderBy: unknown }];
      expect(args.orderBy).toEqual([{ updatedAt: 'desc' }, { id: 'desc' }]);
    });

    it('sorts by businessName via the joined business relation', async () => {
      prisma.lead.findMany.mockResolvedValue([]);
      await service.findMany({ ...baseQuery, sort: 'businessName' });
      const [args] = prisma.lead.findMany.mock.calls[0] as [{ orderBy: unknown }];
      expect(args.orderBy).toEqual([{ business: { businessName: 'asc' } }, { id: 'desc' }]);
    });

    it('rejects an unwhitelisted sort field with InvalidSortFieldException', async () => {
      await expect(
        service.findMany({ ...baseQuery, sort: 'googlePlaceId' }),
      ).rejects.toBeInstanceOf(InvalidSortFieldException);
      expect(prisma.lead.findMany).not.toHaveBeenCalled();
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

    it('composes the flat response shape from the joined business', async () => {
      prisma.lead.findMany.mockResolvedValue([fakeLead({ tags: ['priority'] })]);
      const result = await service.findMany(baseQuery);
      expect(result.items[0]).toMatchObject({
        id: 'lead-1',
        businessId: 'biz-1',
        businessName: "Joe's Diner",
        websiteStatus: 'none',
        pipelineStage: 'new',
        tags: ['priority'],
      });
    });
  });

  describe('findById', () => {
    it('returns null when not found', async () => {
      prisma.lead.findUnique.mockResolvedValue(null);
      await expect(service.findById('missing')).resolves.toBeNull();
    });

    it('scopes the joined business to non-soft-deleted rows and includes it', async () => {
      prisma.lead.findUnique.mockResolvedValue(null);
      await service.findById('lead-1');
      expect(prisma.lead.findUnique).toHaveBeenCalledWith({
        where: { id: 'lead-1', business: { deletedAt: null } },
        include: { business: true },
      });
    });

    it('maps the joined Prisma rows to the API response shape', async () => {
      prisma.lead.findUnique.mockResolvedValue(fakeLead());
      const result = await service.findById('lead-1');
      expect(result).toMatchObject({
        id: 'lead-1',
        businessName: "Joe's Diner",
        pipelineStage: 'new',
      });
    });
  });

  describe('create', () => {
    it('throws BusinessNotFoundException for an unknown business, without writing anything', async () => {
      businessService.findById.mockResolvedValue(null);

      await expect(service.create({ businessId: 'missing' }, 'user-1')).rejects.toBeInstanceOf(
        BusinessNotFoundException,
      );
      expect(prisma.lead.create).not.toHaveBeenCalled();
    });

    it('throws DuplicateLeadException when a lead already exists for the business', async () => {
      businessService.findById.mockResolvedValue(fakeBusiness());
      prisma.lead.findUnique.mockResolvedValue({ id: 'existing-lead' });

      await expect(service.create({ businessId: 'biz-1' }, 'user-1')).rejects.toBeInstanceOf(
        DuplicateLeadException,
      );
      expect(prisma.lead.create).not.toHaveBeenCalled();
    });

    it('throws TeamMemberNotFoundException for an unknown assignee', async () => {
      businessService.findById.mockResolvedValue(fakeBusiness());
      prisma.lead.findUnique.mockResolvedValue(null);
      teamMemberService.findById.mockResolvedValue(null);

      await expect(
        service.create({ businessId: 'biz-1', assignedTo: 'ghost' }, 'user-1'),
      ).rejects.toBeInstanceOf(TeamMemberNotFoundException);
      expect(prisma.lead.create).not.toHaveBeenCalled();
    });

    it('creates the lead and records a CREATED activity in the same transaction', async () => {
      businessService.findById.mockResolvedValue(fakeBusiness());
      prisma.lead.findUnique.mockResolvedValue(null);
      prisma.lead.create.mockResolvedValue(fakeLead({ tags: ['inbound'] }));

      const result = await service.create({ businessId: 'biz-1', tags: ['inbound'] }, 'user-1');

      expect(prisma.lead.create).toHaveBeenCalledWith({
        data: { businessId: 'biz-1', assignedToId: undefined, tags: ['inbound'] },
        include: { business: true },
      });
      expect(activityService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          leadId: 'lead-1',
          actorId: 'user-1',
          type: LeadActivityType.CREATED,
        }),
        prisma,
      );
      expect(result.tags).toEqual(['inbound']);
    });

    it('omits pipelineStage from the create payload when not provided, deferring to the DB default', async () => {
      businessService.findById.mockResolvedValue(fakeBusiness());
      prisma.lead.findUnique.mockResolvedValue(null);
      prisma.lead.create.mockResolvedValue(fakeLead());

      await service.create({ businessId: 'biz-1' }, 'user-1');

      const [args] = prisma.lead.create.mock.calls[0] as [{ data: Record<string, unknown> }];
      expect(args.data).not.toHaveProperty('pipelineStage');
    });
  });

  describe('update', () => {
    it('throws LeadNotFoundException for an unknown lead', async () => {
      prisma.lead.findUnique.mockResolvedValue(null);
      await expect(
        service.update('missing', { pipelineStage: 'won' }, 'user-1'),
      ).rejects.toBeInstanceOf(LeadNotFoundException);
      expect(prisma.lead.update).not.toHaveBeenCalled();
    });

    it('throws TeamMemberNotFoundException when reassigning to an unknown member', async () => {
      prisma.lead.findUnique.mockResolvedValue(fakeLead());
      teamMemberService.findById.mockResolvedValue(null);

      await expect(
        service.update('lead-1', { assignedTo: 'ghost' }, 'user-1'),
      ).rejects.toBeInstanceOf(TeamMemberNotFoundException);
      expect(prisma.lead.update).not.toHaveBeenCalled();
    });

    it('records a stage_changed activity when pipelineStage changes', async () => {
      prisma.lead.findUnique.mockResolvedValue(fakeLead({ pipelineStage: PipelineStage.NEW }));
      prisma.lead.update.mockResolvedValue(fakeLead({ pipelineStage: PipelineStage.QUALIFIED }));

      await service.update('lead-1', { pipelineStage: 'qualified' }, 'user-1');

      expect(activityService.recordMany).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            type: LeadActivityType.STAGE_CHANGED,
            detail: { from: PipelineStage.NEW, to: PipelineStage.QUALIFIED },
          }),
        ],
        prisma,
      );
    });

    it('records an assigned activity when assignedTo is set, unassigned when cleared', async () => {
      teamMemberService.findById.mockResolvedValue({ id: 'rep-2' });
      prisma.lead.findUnique.mockResolvedValue(fakeLead({ assignedToId: null }));
      prisma.lead.update.mockResolvedValue(fakeLead({ assignedToId: 'rep-2' }));

      await service.update('lead-1', { assignedTo: 'rep-2' }, 'user-1');
      expect(activityService.recordMany).toHaveBeenCalledWith(
        [expect.objectContaining({ type: LeadActivityType.ASSIGNED })],
        prisma,
      );

      activityService.recordMany.mockClear();
      prisma.lead.findUnique.mockResolvedValue(fakeLead({ assignedToId: 'rep-2' }));
      prisma.lead.update.mockResolvedValue(fakeLead({ assignedToId: null }));

      await service.update('lead-1', { assignedTo: null }, 'user-1');
      expect(activityService.recordMany).toHaveBeenCalledWith(
        [expect.objectContaining({ type: LeadActivityType.UNASSIGNED })],
        prisma,
      );
    });

    it('distinguishes an omitted assignedTo (leave alone) from explicit null (unassign)', async () => {
      prisma.lead.findUnique.mockResolvedValue(fakeLead({ assignedToId: 'rep-1' }));
      prisma.lead.update.mockResolvedValue(
        fakeLead({ assignedToId: 'rep-1', pipelineStage: PipelineStage.WON }),
      );

      await service.update('lead-1', { pipelineStage: 'won' }, 'user-1');

      const [args] = prisma.lead.update.mock.calls[0] as [{ data: Record<string, unknown> }];
      expect(args.data).not.toHaveProperty('assignedToId');
    });

    it('records a tags_changed activity when tags change', async () => {
      prisma.lead.findUnique.mockResolvedValue(fakeLead({ tags: ['a'] }));
      prisma.lead.update.mockResolvedValue(fakeLead({ tags: ['a', 'b'] }));

      await service.update('lead-1', { tags: ['a', 'b'] }, 'user-1');

      expect(activityService.recordMany).toHaveBeenCalledWith(
        [
          expect.objectContaining({
            type: LeadActivityType.TAGS_CHANGED,
            detail: { from: ['a'], to: ['a', 'b'] },
          }),
        ],
        prisma,
      );
    });

    it('records no activity when nothing meaningful changed', async () => {
      const unchanged = fakeLead();
      prisma.lead.findUnique.mockResolvedValue(unchanged);
      prisma.lead.update.mockResolvedValue(unchanged);

      await service.update('lead-1', { pipelineStage: 'new' }, 'user-1');

      expect(activityService.recordMany).toHaveBeenCalledWith([], prisma);
    });

    it('records multiple activities for a single PATCH that changes several fields', async () => {
      prisma.lead.findUnique.mockResolvedValue(
        fakeLead({ pipelineStage: PipelineStage.NEW, assignedToId: null, tags: [] }),
      );
      teamMemberService.findById.mockResolvedValue({ id: 'rep-2' });
      prisma.lead.update.mockResolvedValue(
        fakeLead({ pipelineStage: PipelineStage.QUALIFIED, assignedToId: 'rep-2', tags: ['hot'] }),
      );

      await service.update(
        'lead-1',
        { pipelineStage: 'qualified', assignedTo: 'rep-2', tags: ['hot'] },
        'user-1',
      );

      const [entries] = activityService.recordMany.mock.calls[0] as [Array<{ type: unknown }>];
      expect(entries).toHaveLength(3);
      expect(entries.map((e) => e.type)).toEqual(
        expect.arrayContaining([
          LeadActivityType.STAGE_CHANGED,
          LeadActivityType.ASSIGNED,
          LeadActivityType.TAGS_CHANGED,
        ]),
      );
    });
  });

  describe('softDelete', () => {
    it('throws LeadNotFoundException for an unknown lead', async () => {
      prisma.lead.findUnique.mockResolvedValue(null);
      await expect(service.softDelete('missing', 'user-1')).rejects.toBeInstanceOf(
        LeadNotFoundException,
      );
      expect(prisma.lead.delete).not.toHaveBeenCalled();
    });

    it('calls lead.delete (rerouted to a soft delete by the Prisma extension) and records a DELETED activity', async () => {
      prisma.lead.findUnique.mockResolvedValue({ id: 'lead-1' });
      prisma.lead.delete.mockResolvedValue({});

      await service.softDelete('lead-1', 'user-1');

      expect(prisma.lead.delete).toHaveBeenCalledWith({ where: { id: 'lead-1' } });
      expect(activityService.record).toHaveBeenCalledWith(
        { leadId: 'lead-1', actorId: 'user-1', type: LeadActivityType.DELETED },
        prisma,
      );
    });
  });

  describe('ensureForBusiness', () => {
    it('reports wasNew false and does not write when a lead already exists for this business', async () => {
      prisma.lead.findUnique.mockResolvedValue(fakeLead());
      const result = await service.ensureForBusiness('biz-1');
      expect(result).toEqual({ id: 'lead-1', wasNew: false });
      expect(prisma.lead.create).not.toHaveBeenCalled();
    });

    it('creates a new lead defaulted to pipelineStage NEW and records CREATED with a null actor', async () => {
      prisma.lead.findUnique.mockResolvedValue(null);
      prisma.lead.create.mockResolvedValue(fakeLead({ id: 'lead-new' }));

      const result = await service.ensureForBusiness('biz-1');

      expect(result).toEqual({ id: 'lead-new', wasNew: true });
      expect(prisma.lead.create).toHaveBeenCalledWith({
        data: { businessId: 'biz-1', pipelineStage: PipelineStage.NEW },
      });
      expect(activityService.record).toHaveBeenCalledWith(
        { leadId: 'lead-new', actorId: null, type: LeadActivityType.CREATED },
        prisma,
      );
    });

    it('never touches pipelineStage/assignedToId/tags on an already-tracked business (CRM progress untouched by rediscovery)', async () => {
      prisma.lead.findUnique.mockResolvedValue(
        fakeLead({ pipelineStage: PipelineStage.WON, tags: ['closed'] }),
      );

      await service.ensureForBusiness('biz-1');

      expect(prisma.lead.create).not.toHaveBeenCalled();
      expect(prisma.lead.update).not.toHaveBeenCalled();
    });
  });
});
