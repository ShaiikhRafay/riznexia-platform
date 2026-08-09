'use client';

import { Button } from '@riznexia/ui';
import Link from 'next/link';
import { PermissionGate } from '@/src/components/auth/permission-gate';
import { PlaceSyncLatestStatus } from './place-sync-latest-status';
import { PlaceSyncSearchForm } from './place-sync-search-form';

// Place Sync Dashboard (F5): "Start new synchronization" (search form,
// gated on `discovery:run`) + "Progress summary"/"Latest synchronization
// status" (always visible — `discovery:read` is universal). "Resume
// existing synchronization" is deliberately not built: the backend has
// no resume/pause concept at all (no PAUSED status, no resume endpoint) —
// founder-approved resolution, see DECISIONS.md.
export function PlaceSyncDashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-h1 text-(--color-text-primary) font-semibold">Place Sync</h1>
        <Button variant="secondary" asChild>
          <Link href="/discovery/sync/history">View History</Link>
        </Button>
      </div>
      <PermissionGate permission="discovery:run">
        <PlaceSyncSearchForm />
      </PermissionGate>
      <PlaceSyncLatestStatus />
    </div>
  );
}
