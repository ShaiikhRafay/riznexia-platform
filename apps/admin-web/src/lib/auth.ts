import type { Permission } from './permissions';

// RBAC Alignment (post-F1, DECISIONS.md D-122) — nav visibility is driven
// by permission, not role. `requiredPermission: null` means "visible to
// any authenticated, provisioned user" (Dashboard/Discovery/Leads — every
// role holds `leads:read`/`discovery:read` today, but the *reason* they're
// always visible is that no permission gates them, not an enumerated role
// list). Every other item names the one real backend permission that
// gates the resource it links to — chosen to reproduce the exact
// visibility F1 originally shipped (D-116's role lists), verified
// item-by-item against apps/api/src/common/rbac/permission.constants.ts,
// not re-decided.
export interface NavItem {
  id: string;
  label: string;
  href: string;
  requiredPermission: Permission | null;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', href: '/', requiredPermission: null },
  { id: 'discovery', label: 'Discovery', href: '/discovery', requiredPermission: null },
  // F5 (Google Places Synchronization) — F1's original `/discovery`
  // placeholder was labeled "F3 / F5", anticipating both modules; F3 took
  // the base route, so F5 gets its own nav entry nested under it rather
  // than a change to F3's own page. Same `discovery:read` floor as
  // Discovery itself — every role holds it, so `requiredPermission: null`
  // matches that item's own reasoning, not a separate role list.
  { id: 'place-sync', label: 'Place Sync', href: '/discovery/sync', requiredPermission: null },
  { id: 'leads', label: 'Leads', href: '/leads', requiredPermission: null },
  // F6 (AI Business Analyzer) — same "no reserved slot, add one additive
  // entry" resolution as F5's `place-sync` item above (DECISIONS.md
  // D-141): viewing an analysis only needs `leads:read` (universal), so
  // `requiredPermission: null` — triggering one is separately gated by
  // `business:analyze` inside the feature itself, not at the nav level.
  {
    id: 'business-analysis',
    label: 'Business Analysis',
    href: '/business-analysis',
    requiredPermission: null,
  },
  // F7 (Theme Engine) — same "no reserved slot, add one additive entry"
  // resolution as F5/F6 (DECISIONS.md D-141/D-149), applied directly.
  // `leads:read` (universal) gates viewing; `theme:select` gates the
  // trigger action inside the feature itself, not the nav entry.
  { id: 'theme-engine', label: 'Theme Engine', href: '/theme-engine', requiredPermission: null },
  // F8 (Website Generator) — same "no reserved slot, add one additive
  // entry" resolution as F5/F6/F7, applied a fourth time. `leads:read`
  // (universal) gates viewing all four pipeline resources; each stage's
  // own generate action is separately gated inside the feature itself
  // (layout:generate/component:generate/content:bind/website:assemble),
  // not at the nav level.
  {
    id: 'website-generator',
    label: 'Website Generator',
    href: '/website-generator',
    requiredPermission: null,
  },
  // F9 (Website Preview) — deliberately NOT `requiredPermission: null` like
  // F5-F8's nav entries. In every prior module, *viewing* only needed the
  // universal `leads:read`, and a separate permission gated the one
  // write/trigger action inside the feature. F9 is structurally different:
  // the backend's own three GETs (`/preview`, `/preview/validation`,
  // `/preview/readiness`) are themselves the privileged, audited action
  // (`website:preview` — `developer`/`viewer` hold neither it nor any
  // fallback read view), so there is no ungated content behind this nav
  // item for those two roles. Gating the nav entry itself avoids a dead
  // end link that would 403 on every page load — see DECISIONS.md D-170.
  {
    id: 'website-preview',
    label: 'Website Preview',
    href: '/website-preview',
    requiredPermission: 'website:preview',
  },
  { id: 'crm', label: 'Sales CRM', href: '/crm', requiredPermission: 'crm:view' },
  // F11 (Deployment) — gated on its own dedicated `deployment:view`, same
  // shape as `crm:view`/`analytics:view` (a real, named module-level
  // permission), not `null` — even though every current role happens to
  // hold it today (DECISIONS.md, this module), matching the convention
  // that a module owning its own `:view` permission is gated by that
  // permission explicitly, not by the coincidence of who currently holds
  // it.
  {
    id: 'deployment',
    label: 'Deployment',
    href: '/deployment',
    requiredPermission: 'deployment:view',
  },
  { id: 'analytics', label: 'Analytics', href: '/analytics', requiredPermission: 'analytics:view' },
  { id: 'team', label: 'Team', href: '/team', requiredPermission: 'team:manage' },
  { id: 'settings', label: 'Settings', href: '/settings', requiredPermission: 'team:manage' },
] as const;

export function isNavItemVisible(item: NavItem, permissions: ReadonlySet<Permission>): boolean {
  return item.requiredPermission === null || permissions.has(item.requiredPermission);
}

export function visibleNavItems(permissions: ReadonlySet<Permission>): NavItem[] {
  return NAV_ITEMS.filter((item) => isNavItemVisible(item, permissions));
}
