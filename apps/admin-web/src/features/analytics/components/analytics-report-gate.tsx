'use client';

import type { ReactNode } from 'react';
import { PermissionGate } from '@/src/components/auth/permission-gate';

// Gates the full per-report drill-down content specifically — distinct
// from, and stricter than, `AnalyticsViewGate`. Matches the real backend
// split exactly: `GET /analytics/dashboard` only needs `analytics:view`
// (developer/viewer hold it), but `GET /analytics/reports/:type` needs
// `analytics:report` (developer/viewer do not). Used by the Reports,
// Audit Logs, and User Activity pages (whose entire content is report
// data, no dashboard widget exists for either) and inline within the
// themed pages' "View full report" sections.
export function AnalyticsReportGate({ children }: { children: ReactNode }) {
  return (
    <PermissionGate
      permission="analytics:report"
      fallback={
        <p className="text-(--color-text-secondary) text-sm">
          You don&rsquo;t have permission to view full analytics reports.
        </p>
      }
    >
      {children}
    </PermissionGate>
  );
}
