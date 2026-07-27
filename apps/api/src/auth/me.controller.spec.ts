import { NotFoundException } from '@nestjs/common';
import { TeamRole as PrismaTeamRole } from '@riznexia/db';
import { MeController } from './me.controller';
import type { TeamMemberService } from './team-member.service';

describe('MeController', () => {
  let teamMemberService: { findById: jest.Mock };
  let controller: MeController;

  beforeEach(() => {
    teamMemberService = { findById: jest.fn() };
    controller = new MeController(teamMemberService as unknown as TeamMemberService);
  });

  it('returns the documented TeamMember shape, not the raw Prisma row', async () => {
    teamMemberService.findById.mockResolvedValue({
      id: 'id-1',
      clerkUserId: 'user_1',
      name: 'Jane Doe',
      email: 'jane@riznexia.com',
      role: PrismaTeamRole.ADMIN,
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    });

    const result = await controller.getCurrentUser({
      id: 'id-1',
      clerkUserId: 'user_1',
      role: 'admin',
    });

    expect(result).toEqual({
      id: 'id-1',
      name: 'Jane Doe',
      email: 'jane@riznexia.com',
      role: 'admin',
    });
    expect(result).not.toHaveProperty('clerkUserId');
    expect(result).not.toHaveProperty('deletedAt');
  });

  it('throws NotFoundException if the member disappeared mid-request', async () => {
    teamMemberService.findById.mockResolvedValue(null);
    await expect(
      controller.getCurrentUser({ id: 'id-1', clerkUserId: 'user_1', role: 'admin' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
