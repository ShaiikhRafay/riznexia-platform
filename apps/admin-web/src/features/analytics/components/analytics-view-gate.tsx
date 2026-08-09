'use client';

import type { ReactNode } from 'react';
import { PermissionGate } from '@/src/components/auth/permission-gate';

// Every F12 page gates its entire content on `analytics:view` at minimum
// (the same real backend gate `GET /analytics/dashboard` itself enforces)
// — same defensive-content-gate pattern as F10's `CrmViewGate`, needed
// across all eight pages in this feature (real reuse, not premature).
export function AnalyticsViewGate({ children }: { children: ReactNode }) {
  return (
    <PermissionGate
      permission="analytics:view"
      fallback={
        <p className="text-(--color-text-secondary) text-sm">
          You don&rsquo;t have permission to view analytics.
        </p>
      }
    >
      {children}
    </PermissionGate>
  );
}
