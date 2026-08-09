'use client';

import { usePermissions } from '@/src/lib/permissions-context';
import { AiUsageWidget } from './ai-usage-widget';
import { ConversionWidget } from './conversion-widget';
import { CostsWidget } from './costs-widget';
import { DeploymentsWidget } from './deployments-widget';
import { LeadsWidget } from './leads-widget';
import { SalesWidget } from './sales-widget';
import { SystemHealthWidget } from './system-health-widget';
import type { DashboardWidgetDefinition } from './widget.interface';
import { WebsiteStatusWidget } from './website-status-widget';

// F2 Improvement 1 — the only file that imports every individual widget
// component. Adding a ninth widget means adding one new widget file plus
// one new entry here — no existing widget file changes, and
// `DashboardHome`/`WidgetRegistry` itself never changes either. Every
// current widget happens to share `analytics:view` (they're all slices of
// the same `GET /analytics/dashboard` response), but the field is set
// per-entry, not once for the whole registry — a future widget backed by
// a different endpoint/permission is a one-line addition, not a
// structural change.
export const DASHBOARD_WIDGETS: readonly DashboardWidgetDefinition[] = [
  { id: 'leads', requiredPermission: 'analytics:view', component: LeadsWidget },
  { id: 'sales', requiredPermission: 'analytics:view', component: SalesWidget },
  { id: 'ai-usage', requiredPermission: 'analytics:view', component: AiUsageWidget },
  { id: 'costs', requiredPermission: 'analytics:view', component: CostsWidget },
  { id: 'deployments', requiredPermission: 'analytics:view', component: DeploymentsWidget },
  { id: 'website-status', requiredPermission: 'analytics:view', component: WebsiteStatusWidget },
  { id: 'conversion', requiredPermission: 'analytics:view', component: ConversionWidget },
  { id: 'system-health', requiredPermission: 'analytics:view', component: SystemHealthWidget },
];

// Dashboard → Widget Registry → Individual Widgets: `DashboardHome` only
// ever renders `<WidgetRegistry/>` — it has no idea `LeadsWidget`,
// `SalesWidget`, etc. exist.
export function WidgetRegistry() {
  const permissions = usePermissions();
  const visible = DASHBOARD_WIDGETS.filter(
    (widget) => widget.requiredPermission === null || permissions.has(widget.requiredPermission),
  );

  return (
    <div
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
      data-testid="widget-registry"
    >
      {visible.map((widget) => (
        <widget.component key={widget.id} />
      ))}
    </div>
  );
}
