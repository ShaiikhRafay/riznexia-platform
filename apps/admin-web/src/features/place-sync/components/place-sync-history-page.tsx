'use client';

import { Button } from '@riznexia/ui';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { PlaceSyncHistoryTable } from './place-sync-history-table';

export function PlaceSyncHistoryPage() {
  return (
    <div className="flex flex-col gap-6">
      <Button variant="ghost" size="sm" asChild className="self-start">
        <Link href="/discovery/sync">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Place Sync
        </Link>
      </Button>
      <h1 className="text-h1 text-(--color-text-primary) font-semibold">Sync Job History</h1>
      <PlaceSyncHistoryTable />
    </div>
  );
}
