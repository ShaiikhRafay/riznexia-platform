'use client';

import { AGGREGATION_PERIODS, type AggregationPeriod } from '@riznexia/shared-types';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import type { UseAnalyticsDashboardOptions } from './api/use-analytics-dashboard';

const DEFAULT_PERIOD: AggregationPeriod = 'monthly';

function isAggregationPeriod(value: string | null): value is AggregationPeriod {
  return value !== null && (AGGREGATION_PERIODS as readonly string[]).includes(value);
}

// The period selector lives in the URL (`?period=monthly`), not local
// state — bookmarkable/shareable, and every widget independently reading
// this hook still produces one deduped `useAnalyticsDashboard` query
// (same queryKey) rather than needing the value threaded through props.
export function useDashboardPeriod(): {
  options: UseAnalyticsDashboardOptions;
  setPeriod: (period: AggregationPeriod) => void;
} {
  const router = useRouter();
  const searchParams = useSearchParams();

  const periodParam = searchParams.get('period');
  const period = isAggregationPeriod(periodParam) ? periodParam : DEFAULT_PERIOD;
  const fromDate = searchParams.get('from') ?? undefined;
  const toDate = searchParams.get('to') ?? undefined;

  const setPeriod = useCallback(
    (next: AggregationPeriod) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('period', next);
      if (next !== 'custom') {
        params.delete('from');
        params.delete('to');
      }
      router.push(`?${params.toString()}`);
    },
    [router, searchParams],
  );

  const options = useMemo<UseAnalyticsDashboardOptions>(
    () => ({ period, fromDate, toDate }),
    [period, fromDate, toDate],
  );

  return { options, setPeriod };
}
