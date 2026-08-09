import type { Permission } from '@/src/lib/permissions';

// F2 Improvement 1 — the Dashboard Widget Registry contract. Mirrors the
// backend's own registry idiom (packages/website-preview/src/validation/
// validator-registry.ts's `WebsiteValidator`/`VALIDATOR_REGISTRY`): one
// small interface, one array, one place that knows about every widget.
// Each widget is a fully self-contained component — it owns its own data
// fetching (via the shared `useAnalyticsDashboard` query, deduped by
// TanStack Query) and its own loading/error presentation — so the
// registry only ever needs to know a widget's `id`/permission/component,
// never its internals.
export interface DashboardWidgetDefinition {
  id: string;
  /** `null` means visible to anyone who can see the widget grid at all. */
  requiredPermission: Permission | null;
  component: React.ComponentType;
}
