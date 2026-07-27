import { TeamRole as PrismaTeamRole } from '@riznexia/db';
import { toApiRole, toPrismaRole } from './team-member.mapper';

describe('team-member.mapper', () => {
  it.each([
    [PrismaTeamRole.ADMIN, 'admin'],
    [PrismaTeamRole.MANAGER, 'manager'],
    [PrismaTeamRole.SALES_REP, 'sales_rep'],
  ] as const)('maps Prisma role %s to API role %s', (prismaRole, apiRole) => {
    expect(toApiRole(prismaRole)).toBe(apiRole);
  });

  it.each([
    ['admin', PrismaTeamRole.ADMIN],
    ['manager', PrismaTeamRole.MANAGER],
    ['sales_rep', PrismaTeamRole.SALES_REP],
  ] as const)('maps API role %s to Prisma role %s', (apiRole, prismaRole) => {
    expect(toPrismaRole(apiRole)).toBe(prismaRole);
  });

  it('round-trips every role without loss', () => {
    for (const role of Object.values(PrismaTeamRole)) {
      expect(toPrismaRole(toApiRole(role))).toBe(role);
    }
  });
});
