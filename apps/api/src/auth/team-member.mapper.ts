import { TeamRole as PrismaTeamRole } from '@riznexia/db';
import type { TeamRole } from '@riznexia/shared-types';

// The only place the Prisma enum's casing (SUPER_ADMIN/ADMIN/...) and the
// API contract's casing (super_admin/admin/..., per Doc 19 §5) meet —
// every other file works with one or the other, never juggles both.
const PRISMA_TO_API: Record<PrismaTeamRole, TeamRole> = {
  [PrismaTeamRole.SUPER_ADMIN]: 'super_admin',
  [PrismaTeamRole.ADMIN]: 'admin',
  [PrismaTeamRole.SALES_MANAGER]: 'sales_manager',
  [PrismaTeamRole.DEVELOPER]: 'developer',
  [PrismaTeamRole.SALES_EXECUTIVE]: 'sales_executive',
  [PrismaTeamRole.VIEWER]: 'viewer',
};

const API_TO_PRISMA: Record<TeamRole, PrismaTeamRole> = {
  super_admin: PrismaTeamRole.SUPER_ADMIN,
  admin: PrismaTeamRole.ADMIN,
  sales_manager: PrismaTeamRole.SALES_MANAGER,
  developer: PrismaTeamRole.DEVELOPER,
  sales_executive: PrismaTeamRole.SALES_EXECUTIVE,
  viewer: PrismaTeamRole.VIEWER,
};

export function toApiRole(role: PrismaTeamRole): TeamRole {
  return PRISMA_TO_API[role];
}

export function toPrismaRole(role: TeamRole): PrismaTeamRole {
  return API_TO_PRISMA[role];
}
