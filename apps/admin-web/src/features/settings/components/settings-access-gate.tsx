'use client';

import type { ReactNode } from 'react';
import { PermissionGate } from '@/src/components/auth/permission-gate';

// Every F13 page gates its entire content on `team:manage` at minimum — the
// same permission the existing `/settings` `NAV_ITEMS` entry has held since
// F1/RBAC Alignment. Protects direct-URL access, not just the hidden nav
// link, same defensive-content-gate precedent as F12's `AnalyticsViewGate`.
export function SettingsAccessGate({ children }: { children: ReactNode }) {
  return (
    <PermissionGate
      permission="team:manage"
      fallback={
        <p className="text-(--color-text-secondary) text-sm">
          You don&rsquo;t have permission to view settings.
        </p>
      }
    >
      {children}
    </PermissionGate>
  );
}
