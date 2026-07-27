import { z } from 'zod';

// API-facing role strings — lowercase, per docs/19-api-architecture.md §5
// (OpenAPI `TeamMember.role` enum). The Prisma `TeamRole` enum is uppercase;
// mapping between the two happens at the API boundary (apps/api/src/auth),
// never by changing this documented contract to match the DB's casing.
export const TEAM_ROLES = ['admin', 'manager', 'sales_rep'] as const;
export type TeamRole = (typeof TEAM_ROLES)[number];

export const teamMemberSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  role: z.enum(TEAM_ROLES),
});

export type TeamMember = z.infer<typeof teamMemberSchema>;
