'use client';

import { Button, DataTable } from '@riznexia/ui';
import { RefreshCw } from 'lucide-react';
import { useDiscoveryJobs } from '../api/use-discovery-jobs';
import { DISCOVERY_HISTORY_COLUMNS } from './discovery-history-columns';

// Discovery History + Pagination (approved F3 architecture): the backend
// endpoint (`GET /discovery-jobs`) returns a fixed top-50 list with no
// pagination/sort/filter params of its own — so this table uses the
// shared DataTable's `client` mode throughout, the honest fit for what
// the API actually supports, not an invented server capability.
export function DiscoveryHistoryTable() {
  const { data, isLoading, isFetching, error, refetch } = useDiscoveryJobs();

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-h2 text-(--color-text-primary) font-semibold">Discovery History</h2>
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
        columns={DISCOVERY_HISTORY_COLUMNS}
        data={data ?? []}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        error={error}
        onRetry={() => void refetch()}
        emptyTitle="No discovery searches yet"
        emptyDescription="Start a new search above to find businesses in a city and category."
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
