import type { TeamMember as TeamMemberModel } from '@riznexia/db';
import type { TeamMember as TeamMemberResponse } from '@riznexia/shared-types';
import { toApiRole } from '../team-member.mapper';

// Maps the Prisma model to the exact response shape from
// docs/19-api-architecture.md §3 (`GET /me`) — never return a raw Prisma
// row from a controller (it would leak clerkUserId/deletedAt/timestamps
// that aren't part of the documented contract).
export function toTeamMemberResponse(member: TeamMemberModel): TeamMemberResponse {
  return {
    id: member.id,
    name: member.name,
    email: member.email,
    role: toApiRole(member.role),
  };
}
