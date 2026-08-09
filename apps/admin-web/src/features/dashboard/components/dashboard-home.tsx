'use client';

import { useHasPermission } from '@/src/lib/permissions-context';
import { RefreshIntervalProvider } from '../refresh-interval';
import { CrmPipelineSection } from './crm-pipeline-section';
import { DashboardToolbar } from './dashboard-toolbar';
import { MyWorkPanel } from './my-work-panel';
import { WidgetRegistry } from '../widgets/widget-registry';

// F2 — top-level composition. Structural "which section renders at all"
// decisions use `useHasPermission` directly (component-level branching is
// what hooks are for); `<PermissionGate/>` remains the tool for finer,
// inline gating within a section (e.g. a single button), not duplicated
// here. A role holding neither `analytics:view` nor `crm:report` — today,
// only `sales_executive` — sees the "My Work" fallback instead of an
// empty page (frontend architecture review's open question 1, resolved
// as approved).
export function DashboardHome() {
  const hasAnalyticsView = useHasPermission('analytics:view');
  const hasCrmReport = useHasPermission('crm:report');
  const showMyWork = !hasAnalyticsView && !hasCrmReport;

  return (
    <RefreshIntervalProvider>
      <div className="flex flex-col gap-6">
        <DashboardToolbar />
        {hasAnalyticsView ? <WidgetRegistry /> : null}
        {hasCrmReport ? <CrmPipelineSection /> : null}
        {showMyWork ? <MyWorkPanel /> : null}
      </div>
    </RefreshIntervalProvider>
  );
}
