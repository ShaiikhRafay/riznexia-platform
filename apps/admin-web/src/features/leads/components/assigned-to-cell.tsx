'use client';

import { useCurrentUser } from '@/src/lib/current-user-context';

export interface AssignedToCellProps {
  assignedTo: string | null;
}

// Assigned User display (F4, founder-approved resolution): `assignedTo` is
// a bare TeamMember UUID with no name-lookup endpoint available anywhere
// in the backend — the only identity the frontend can resolve is its own
// session's, via `useCurrentUser()` (already in context, no extra call).
// Shows "You" on a match, otherwise the raw UUID — never a fabricated
// name.
export function AssignedToCell({ assignedTo }: AssignedToCellProps) {
  const currentUser = useCurrentUser();

  if (!assignedTo) {
    return <span className="text-(--color-text-secondary)">Unassigned</span>;
  }
  if (assignedTo === currentUser.id) {
    return <span className="text-(--color-text-primary) font-medium">You</span>;
  }
  return <span className="text-(--color-text-secondary) font-mono text-xs">{assignedTo}</span>;
}
