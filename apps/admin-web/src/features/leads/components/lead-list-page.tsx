'use client';

import { Button } from '@riznexia/ui';
import { Plus } from 'lucide-react';
import Link from 'next/link';
import { PermissionGate } from '@/src/components/auth/permission-gate';
import { LeadListTable } from './lead-list-table';

export function LeadListPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-h1 text-(--color-text-primary) font-semibold">Leads</h1>
        <PermissionGate permission="leads:write">
          <Button asChild>
            <Link href="/leads/new">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Create Lead
            </Link>
          </Button>
        </PermissionGate>
      </div>
      <LeadListTable />
    </div>
  );
}
