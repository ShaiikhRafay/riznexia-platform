import { TeamRole as PrismaTeamRole } from '@riznexia/db';
import type { TeamRole } from '@riznexia/shared-types';

// The only place the Prisma enum's casing (ADMIN/MANAGER/SALES_REP) and the
// API contract's casing (admin/manager/sales_rep, per Doc 19 §5) meet —
// every other file works with one or the other, never juggles both.
const PRISMA_TO_API: Record<PrismaTeamRole, TeamRole> = {
  [PrismaTeamRole.ADMIN]: 'admin',
  [PrismaTeamRole.MANAGER]: 'manager',
  [PrismaTeamRole.SALES_REP]: 'sales_rep',
};

const API_TO_PRISMA: Record<TeamRole, PrismaTeamRole> = {
  admin: PrismaTeamRole.ADMIN,
  manager: PrismaTeamRole.MANAGER,
  sales_rep: PrismaTeamRole.SALES_REP,
};

export function toApiRole(role: PrismaTeamRole): TeamRole {
  return PRISMA_TO_API[role];
}

export function toPrismaRole(role: TeamRole): PrismaTeamRole {
  return API_TO_PRISMA[role];
}
