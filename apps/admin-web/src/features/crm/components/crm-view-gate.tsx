'use client';

import type { ReactNode } from 'react';
import { PermissionGate } from '@/src/components/auth/permission-gate';

// Every F10 page gates its entire content on `crm:view`, not just a
// button — unlike F1-F9's own pages (where `leads:read`/similar is
// universal and only a write/trigger action is gated), `crm:view` is
// genuinely NOT held by `developer`/`viewer`. Reused across all seven F10
// pages, so this is real intra-feature reuse (needed seven times), not a
// premature abstraction.
export function CrmViewGate({ children }: { children: ReactNode }) {
  return (
    <PermissionGate
      permission="crm:view"
      fallback={
        <p className="text-(--color-text-secondary) text-sm">
          You don&rsquo;t have permission to view the Sales CRM.
        </p>
      }
    >
      {children}
    </PermissionGate>
  );
}
