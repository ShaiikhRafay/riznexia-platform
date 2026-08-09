import type { TeamRole } from '@riznexia/shared-types';
import { notFound } from 'next/navigation';
import { getPermissionsForRole, type Permission } from './permissions';

// RBAC Alignment — a permission-based Server Component route guard, ready
// for the first future module that owns a route needing more than
// "authenticated and provisioned" (e.g. F13 Team, F14 Settings — both
// currently placeholders with no real permission requirement of their own
// yet). Calling `notFound()` rather than showing an "access denied" page
// treats an unauthorized route the same way a nonexistent one is treated,
// consistent with the sidebar never showing it in the first place
// (DECISIONS.md D-122). This never replaces backend enforcement — the
// corresponding API call is independently guarded server-side regardless
// of what this function decides.
export function assertPermission(role: TeamRole, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    notFound();
  }
}

export function hasPermission(role: TeamRole, permission: Permission): boolean {
  return getPermissionsForRole(role).includes(permission);
}

export function hasAnyPermission(role: TeamRole, permissions: readonly Permission[]): boolean {
  if (permissions.length === 0) {
    return true;
  }
  const granted = getPermissionsForRole(role);
  return permissions.some((permission) => granted.includes(permission));
}
