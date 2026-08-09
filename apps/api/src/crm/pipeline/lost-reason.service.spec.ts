import type { PrismaClient } from '@riznexia/db';
import { LostReasonNotFoundException } from '../../common/exceptions/app.exception';
import { LostReasonService } from './lost-reason.service';

function fakeReasonRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'reason-1',
    key: 'price_too_high',
    label: 'Price too high',
    order: 1,
    archivedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('LostReasonService', () => {
  let prisma: {
    lostReason: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
  };
  let service: LostReasonService;

  beforeEach(() => {
    prisma = {
      lostReason: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    service = new LostReasonService(prisma as unknown as PrismaClient);
  });

  it('filters archived reasons by default', async () => {
    prisma.lostReason.findMany.mockResolvedValue([]);
    await service.list({ includeArchived: false });
    expect(prisma.lostReason.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { archivedAt: null } }),
    );
  });

  it('throws LostReasonNotFoundException on update of an unknown id', async () => {
    prisma.lostReason.findUnique.mockResolvedValue(null);
    await expect(service.update('missing', { label: 'x' })).rejects.toBeInstanceOf(
      LostReasonNotFoundException,
    );
  });

  it('archives rather than deletes', async () => {
    prisma.lostReason.findUnique.mockResolvedValue(fakeReasonRow());
    prisma.lostReason.update.mockResolvedValue(fakeReasonRow({ archivedAt: new Date() }));
    await service.archive('reason-1');
    expect(prisma.lostReason.update).toHaveBeenCalledWith({
      where: { id: 'reason-1' },
      data: { archivedAt: expect.any(Date) },
    });
  });

  it('creates a new reason', async () => {
    prisma.lostReason.create.mockResolvedValue(fakeReasonRow());
    const result = await service.create({
      key: 'price_too_high',
      label: 'Price too high',
      order: 1,
    });
    expect(result.key).toBe('price_too_high');
  });
});
