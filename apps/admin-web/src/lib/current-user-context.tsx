'use client';

import type { TeamMember } from '@riznexia/shared-types';
import { createContext, useContext } from 'react';

const CurrentUserContext = createContext<TeamMember | null>(null);

export interface CurrentUserProviderProps {
  currentUser: TeamMember;
  children: React.ReactNode;
}

// Module F2 — makes the `TeamMember` already fetched once via `GET /me` in
// `(dashboard)/layout.tsx` available to any descendant (e.g. the "My Work"
// fallback panel needs `id` to filter `GET /crm/tasks?assignedToId=`)
// without a second request — mirrors `PermissionsProvider`'s same
// "derive once, read via context" shape.
export function CurrentUserProvider({ currentUser, children }: CurrentUserProviderProps) {
  return <CurrentUserContext.Provider value={currentUser}>{children}</CurrentUserContext.Provider>;
}

export function useCurrentUser(): TeamMember {
  const context = useContext(CurrentUserContext);
  if (!context) {
    throw new Error('useCurrentUser must be used within a <CurrentUserProvider>');
  }
  return context;
}
