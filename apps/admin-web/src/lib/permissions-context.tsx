'use client';

import type { TeamRole } from '@riznexia/shared-types';
import { createContext, useContext, useMemo } from 'react';
import { getPermissionsForRole, type Permission } from './permissions';

const PermissionsContext = createContext<ReadonlySet<Permission> | null>(null);

export interface PermissionsProviderProps {
  role: TeamRole;
  children: React.ReactNode;
}

// RBAC Alignment — the session's `role` (already fetched via `GET /me` in
// `(dashboard)/layout.tsx`, no additional API call) is derived into a
// permission set once here and made available to every component below
// via context, so no component below this needs to see or branch on
// `role` itself (DECISIONS.md D-122).
export function PermissionsProvider({ role, children }: PermissionsProviderProps) {
  const permissions = useMemo(() => new Set(getPermissionsForRole(role)), [role]);
  return <PermissionsContext.Provider value={permissions}>{children}</PermissionsContext.Provider>;
}

export function usePermissions(): ReadonlySet<Permission> {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error('usePermissions must be used within a <PermissionsProvider>');
  }
  return context;
}

export function useHasPermission(permission: Permission): boolean {
  return usePermissions().has(permission);
}

// "Any of" semantics — a nav item or UI affordance gated by more than one
// acceptable permission (e.g. a screen reachable via either of two
// capabilities) is visible if the session holds at least one of them.
export function useHasAnyPermission(permissions: readonly Permission[]): boolean {
  const granted = usePermissions();
  if (permissions.length === 0) {
    return true;
  }
  return permissions.some((permission) => granted.has(permission));
}
