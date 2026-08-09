'use client';

import { Button } from '@riznexia/ui';
import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import { RefreshCw } from 'lucide-react';
import { PeriodSelect } from './period-select';
import { RefreshIntervalSelect } from './refresh-interval-select';

// Manual refresh invalidates every dashboard query key at once — simpler
// and safer than each section needing its own button (a rep on the "My
// Work" fallback still gets one refresh control, not zero).
const DASHBOARD_QUERY_KEYS = ['analytics-dashboard', 'crm-dashboard', 'crm-tasks'];

export function DashboardToolbar() {
  const queryClient = useQueryClient();
  const isFetching =
    useIsFetching({
      predicate: (query) => DASHBOARD_QUERY_KEYS.includes(String(query.queryKey[0])),
    }) > 0;

  function handleRefresh() {
    for (const key of DASHBOARD_QUERY_KEYS) {
      void queryClient.invalidateQueries({ queryKey: [key] });
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-h1 text-(--color-text-primary) font-semibold">Dashboard</h1>
      <div className="flex items-center gap-2">
        <PeriodSelect />
        <RefreshIntervalSelect />
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          aria-label="Refresh now"
          disabled={isFetching}
        >
          <RefreshCw
            className={isFetching ? 'h-4 w-4 animate-spin' : 'h-4 w-4'}
            aria-hidden="true"
          />
        </Button>
      </div>
    </div>
  );
}
