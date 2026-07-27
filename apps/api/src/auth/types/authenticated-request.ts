import type { Request } from 'express';
import type { TeamRole } from '@riznexia/shared-types';

// The identity ClerkAuthGuard resolves and attaches to the request context
// (Doc 16 §6). Deliberately minimal — just enough for role checks and
// ownership/assignment lookups; anything else a handler needs, it fetches
// itself rather than growing this shape into a dumping ground.
export interface RequestTeamMember {
  id: string;
  clerkUserId: string;
  role: TeamRole;
}

export interface AuthenticatedRequest extends Request {
  user: RequestTeamMember;
}
