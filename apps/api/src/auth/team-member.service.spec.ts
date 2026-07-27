import type { ConfigService } from '@nestjs/config';
import { TeamRole as PrismaTeamRole } from '@riznexia/db';
import { InvalidWebhookSignatureException } from '../common/exceptions/app.exception';
import { TeamMemberService } from './team-member.service';

describe('TeamMemberService', () => {
  const prismaMock = {
    teamMember: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      updateMany: jest.fn(),
    },
  };
  let configGetMock: jest.Mock;
  let service: TeamMemberService;

  beforeEach(() => {
    jest.resetAllMocks();
    configGetMock = jest.fn().mockReturnValue('riznexia.com');
    service = new TeamMemberService(
      prismaMock as unknown as ConstructorParameters<typeof TeamMemberService>[0],
      { get: configGetMock } as unknown as ConfigService,
    );
  });

  describe('findByClerkUserId', () => {
    it('excludes soft-deleted rows', async () => {
      prismaMock.teamMember.findUnique.mockResolvedValue(null);
      await service.findByClerkUserId('user_123');
      expect(prismaMock.teamMember.findUnique).toHaveBeenCalledWith({
        where: { clerkUserId: 'user_123', deletedAt: null },
      });
    });
  });

  describe('toRequestUser', () => {
    it('maps the Prisma model to the minimal request-user shape', () => {
      const result = service.toRequestUser({
        id: 'id-1',
        clerkUserId: 'user_1',
        role: PrismaTeamRole.MANAGER,
      } as never);
      expect(result).toEqual({ id: 'id-1', clerkUserId: 'user_1', role: 'manager' });
    });
  });

  describe('syncFromClerk', () => {
    it('upserts a team member for an allowed domain', async () => {
      prismaMock.teamMember.upsert.mockResolvedValue({ id: 'id-1' });
      await service.syncFromClerk({
        clerkUserId: 'user_1',
        name: 'Jane Doe',
        email: 'jane@riznexia.com',
      });
      expect(prismaMock.teamMember.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { clerkUserId: 'user_1' },
          create: expect.objectContaining({ role: PrismaTeamRole.SALES_REP }),
        }),
      );
    });

    it('rejects an email outside the allowed domain (defense in depth, Doc 15 §1)', async () => {
      await expect(
        service.syncFromClerk({
          clerkUserId: 'user_2',
          name: 'Outsider',
          email: 'outsider@gmail.com',
        }),
      ).rejects.toBeInstanceOf(InvalidWebhookSignatureException);
      expect(prismaMock.teamMember.upsert).not.toHaveBeenCalled();
    });

    it('allows any domain when ALLOWED_EMAIL_DOMAIN is unset', async () => {
      configGetMock.mockReturnValue(undefined);
      prismaMock.teamMember.upsert.mockResolvedValue({ id: 'id-1' });
      await expect(
        service.syncFromClerk({
          clerkUserId: 'user_3',
          name: 'Anyone',
          email: 'anyone@example.com',
        }),
      ).resolves.toBeDefined();
    });
  });

  describe('softDeleteByClerkUserId', () => {
    it('sets deletedAt rather than issuing a hard delete', async () => {
      await service.softDeleteByClerkUserId('user_1');
      expect(prismaMock.teamMember.updateMany).toHaveBeenCalledWith({
        where: { clerkUserId: 'user_1' },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });
});
