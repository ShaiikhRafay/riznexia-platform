import { z } from 'zod';

// API-facing role strings — lowercase, per docs/19-api-architecture.md §5
// (OpenAPI `TeamMember.role` enum). The Prisma `TeamRole` enum is uppercase;
// mapping between the two happens at the API boundary (apps/api/src/auth),
// never by changing this documented contract to match the DB's casing.
//
// Module M3's six-role taxonomy (DECISIONS.md D-023), replacing the
// original three (admin/manager/sales_rep). super_admin/admin/sales_manager
// are seniority-ordered within the sales chain of command; developer is a
// lateral technical-access role, not a rung on that ladder; viewer is
// strictly read-only. The numeric hierarchy used for "at least this
// seniority" checks lives in apps/api/src/common/rbac/, not here — this
// array is just the valid-values contract, order carries no meaning.
export const TEAM_ROLES = [
  'super_admin',
  'admin',
  'sales_manager',
  'developer',
  'sales_executive',
  'viewer',
] as const;
export type TeamRole = (typeof TEAM_ROLES)[number];

export const teamMemberSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  role: z.enum(TEAM_ROLES),
});

export type TeamMember = z.infer<typeof teamMemberSchema>;
