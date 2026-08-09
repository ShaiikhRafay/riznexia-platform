'use client';

import { Button, DataTable } from '@riznexia/ui';
import { RefreshCw } from 'lucide-react';
import { usePlaceSyncJobs } from '../api/use-place-sync-jobs';
import { PLACE_SYNC_HISTORY_COLUMNS } from './place-sync-history-columns';

// Sync Job History + Pagination (F5): `GET /place-sync-jobs` returns a
// fixed top-50 list with no pagination/sort/filter params of its own —
// verified directly against place-sync.service.ts, the identical shape to
// `GET /discovery-jobs`. This table uses the shared DataTable's `client`
// mode throughout for the same reason Discovery History does (D-130):
// the honest fit for what the API actually supports, not an invented
// server capability.
export function PlaceSyncHistoryTable() {
  const { data, isLoading, isFetching, error, refetch } = usePlaceSyncJobs();

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-h2 text-(--color-text-primary) font-semibold">Sync Job History</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => void refetch()}
          aria-label="Refresh"
          disabled={isFetching}
        >
          <RefreshCw
            className={isFetching ? 'h-4 w-4 animate-spin' : 'h-4 w-4'}
            aria-hidden="true"
          />
        </Button>
      </div>
      <DataTable
        columns={PLACE_SYNC_HISTORY_COLUMNS}
        data={data ?? []}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        error={error}
        onRetry={() => void refetch()}
        emptyTitle="No synchronizations yet"
        emptyDescription="Start a new synchronization from the Dashboard to sync businesses from Google Places."
        sorting={{ mode: 'client' }}
        pagination={{ mode: 'client', initialPageSize: 10, pageSizeOptions: [10, 25, 50] }}
        enableGlobalFilter
        globalFilterPlaceholder="Search history…"
        enableColumnFilters
        enableColumnVisibility
      />
    </section>
  );
}
