'use client';

import type { Permission } from '@/src/lib/permissions';
import { useHasAnyPermission } from '@/src/lib/permissions-context';

export interface PermissionGateProps {
  /** Visible if the session holds this permission. */
  permission?: Permission;
  /** Visible if the session holds at least one of these. */
  anyOf?: readonly Permission[];
  /** Rendered instead of `children` when the check fails — defaults to nothing, never a disabled affordance (docs/17 §7: "not shown-then-disabled"). */
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

// RBAC Alignment — the generic building block for "components must support
// permission-based rendering." Every future feature module (F2+) wraps a
// button, section, or row in this rather than writing its own
// `if (role === ...)` check — the one place that pattern lives.
export function PermissionGate({
  permission,
  anyOf,
  fallback = null,
  children,
}: PermissionGateProps) {
  const required = permission ? [permission] : (anyOf ?? []);
  const allowed = useHasAnyPermission(required);
  return <>{allowed ? children : fallback}</>;
}
