'use client';

import { PermissionGate } from '@/src/components/auth/permission-gate';
import { DiscoverySearchForm } from './discovery-search-form';
import { DiscoveryHistoryTable } from './discovery-history-table';

// Every role holds `discovery:read` (the history table needs nothing
// beyond being authenticated), but `discovery:run` is withheld from
// developer/viewer — the New Search form simply doesn't render for them,
// never a disabled form (docs/17's "not shown-then-disabled" rule, same
// one the sidebar already follows).
export function DiscoveryPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-h1 text-(--color-text-primary) font-semibold">Discovery</h1>
      <PermissionGate permission="discovery:run">
        <DiscoverySearchForm />
      </PermissionGate>
      <DiscoveryHistoryTable />
    </div>
  );
}
