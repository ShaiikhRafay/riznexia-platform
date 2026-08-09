import type { PrismaClient } from '@riznexia/db';
import { SalesStageNotFoundException } from '../../common/exceptions/app.exception';
import { SalesStageService } from './sales-stage.service';

function fakeStageRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'stage-1',
    key: 'new',
    name: 'New',
    order: 1,
    isWon: false,
    isLost: false,
    color: null,
    archivedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('SalesStageService', () => {
  let prisma: {
    salesStage: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };
  let service: SalesStageService;

  beforeEach(() => {
    prisma = {
      salesStage: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    service = new SalesStageService(prisma as unknown as PrismaClient);
  });

  describe('list', () => {
    it('filters out archived stages by default', async () => {
      prisma.salesStage.findMany.mockResolvedValue([fakeStageRow()]);
      await service.list({ includeArchived: false });
      expect(prisma.salesStage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { archivedAt: null } }),
      );
    });

    it('includes archived stages when requested', async () => {
      prisma.salesStage.findMany.mockResolvedValue([]);
      await service.list({ includeArchived: true });
      expect(prisma.salesStage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
    });
  });

  describe('create', () => {
    it('defaults isWon/isLost to false when the caller omits them', async () => {
      prisma.salesStage.create.mockResolvedValue(fakeStageRow());
      await service.create({ key: 'new', name: 'New', order: 1, isWon: false, isLost: false });
      expect(prisma.salesStage.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ isWon: false, isLost: false }) }),
      );
    });
  });

  describe('update', () => {
    it('throws SalesStageNotFoundException when the stage does not exist', async () => {
      prisma.salesStage.findUnique.mockResolvedValue(null);
      await expect(service.update('missing', { name: 'X' })).rejects.toBeInstanceOf(
        SalesStageNotFoundException,
      );
    });

    it('updates only the provided fields', async () => {
      prisma.salesStage.findUnique.mockResolvedValue(fakeStageRow());
      prisma.salesStage.update.mockResolvedValue(fakeStageRow({ name: 'Renamed' }));
      await service.update('stage-1', { name: 'Renamed' });
      expect(prisma.salesStage.update).toHaveBeenCalledWith({
        where: { id: 'stage-1' },
        data: { name: 'Renamed' },
      });
    });
  });

  describe('archive', () => {
    it('sets archivedAt rather than deleting the row (founder Decision 10)', async () => {
      prisma.salesStage.findUnique.mockResolvedValue(fakeStageRow());
      prisma.salesStage.update.mockResolvedValue(fakeStageRow({ archivedAt: new Date() }));
      await service.archive('stage-1');
      expect(prisma.salesStage.update).toHaveBeenCalledWith({
        where: { id: 'stage-1' },
        data: { archivedAt: expect.any(Date) },
      });
    });

    it('throws SalesStageNotFoundException for an unknown id', async () => {
      prisma.salesStage.findUnique.mockResolvedValue(null);
      await expect(service.archive('missing')).rejects.toBeInstanceOf(SalesStageNotFoundException);
    });
  });
});
