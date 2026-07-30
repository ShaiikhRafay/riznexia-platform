import type { PrismaClient } from '@riznexia/db';
import { AuditLogService } from './audit-log.service';

describe('AuditLogService', () => {
  let prisma: { auditLog: { create: jest.Mock } };
  let service: AuditLogService;

  beforeEach(() => {
    prisma = { auditLog: { create: jest.fn() } };
    service = new AuditLogService(prisma as unknown as PrismaClient);
  });

  it('writes actorId/action/entityType/entityId/metadata/ipAddress verbatim', async () => {
    prisma.auditLog.create.mockResolvedValue({});
    await service.record({
      actorId: 'user-1',
      action: 'lead.stage_changed',
      entityType: 'Lead',
      entityId: 'lead-1',
      metadata: { from: 'new', to: 'qualified' },
      ipAddress: '10.0.0.1',
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: {
        actorId: 'user-1',
        action: 'lead.stage_changed',
        entityType: 'Lead',
        entityId: 'lead-1',
        metadata: { from: 'new', to: 'qualified' },
        ipAddress: '10.0.0.1',
      },
    });
  });

  it('defaults ipAddress to null when omitted', async () => {
    prisma.auditLog.create.mockResolvedValue({});
    await service.record({ actorId: 'user-1', action: 'x', entityType: 'Y', entityId: 'z' });

    const [args] = prisma.auditLog.create.mock.calls[0] as [{ data: { ipAddress: unknown } }];
    expect(args.data.ipAddress).toBeNull();
  });

  it('swallows a write failure rather than throwing (the privileged action already succeeded)', async () => {
    prisma.auditLog.create.mockRejectedValue(new Error('db unavailable'));
    await expect(
      service.record({ actorId: 'user-1', action: 'x', entityType: 'Y', entityId: 'z' }),
    ).resolves.toBeUndefined();
  });
});
