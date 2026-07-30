import { TeamRole as PrismaTeamRole } from '@riznexia/db';
import { toApiRole, toPrismaRole } from './team-member.mapper';

describe('team-member.mapper', () => {
  it.each([
    [PrismaTeamRole.SUPER_ADMIN, 'super_admin'],
    [PrismaTeamRole.ADMIN, 'admin'],
    [PrismaTeamRole.SALES_MANAGER, 'sales_manager'],
    [PrismaTeamRole.DEVELOPER, 'developer'],
    [PrismaTeamRole.SALES_EXECUTIVE, 'sales_executive'],
    [PrismaTeamRole.VIEWER, 'viewer'],
  ] as const)('maps Prisma role %s to API role %s', (prismaRole, apiRole) => {
    expect(toApiRole(prismaRole)).toBe(apiRole);
  });

  it.each([
    ['super_admin', PrismaTeamRole.SUPER_ADMIN],
    ['admin', PrismaTeamRole.ADMIN],
    ['sales_manager', PrismaTeamRole.SALES_MANAGER],
    ['developer', PrismaTeamRole.DEVELOPER],
    ['sales_executive', PrismaTeamRole.SALES_EXECUTIVE],
    ['viewer', PrismaTeamRole.VIEWER],
  ] as const)('maps API role %s to Prisma role %s', (apiRole, prismaRole) => {
    expect(toPrismaRole(apiRole)).toBe(prismaRole);
  });

  it('round-trips every role without loss', () => {
    for (const role of Object.values(PrismaTeamRole)) {
      expect(toPrismaRole(toApiRole(role))).toBe(role);
    }
  });
});
