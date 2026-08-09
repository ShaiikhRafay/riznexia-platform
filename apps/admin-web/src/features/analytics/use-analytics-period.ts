'use client';

import { AGGREGATION_PERIODS, type AggregationPeriod } from '@riznexia/shared-types';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';

const DEFAULT_PERIOD: AggregationPeriod = 'monthly';

function isAggregationPeriod(value: string | null): value is AggregationPeriod {
  return value !== null && (AGGREGATION_PERIODS as readonly string[]).includes(value);
}

export interface AnalyticsPeriodOptions {
  period: AggregationPeriod;
  fromDate?: string;
  toDate?: string;
}

// F12's own period+range control — feature-local, not a reuse of F2's
// `useDashboardPeriod()` (DECISIONS.md for this module): F2's version
// deliberately excludes `custom` (no range picker existed when it was
// built); F12's brief explicitly requires Custom Range as one of the five
// real backend filters, so this hook needed a `setCustomRange` capability
// F2's doesn't have. Rather than modify a previous module for a
// capability only this one needs, this is a small, independent,
// URL-persisted (`?period=&from=&to=`) copy — same shape and mechanism as
// F2's own hook, diverging only in exposing the range setter.
export function useAnalyticsPeriod(): {
  options: AnalyticsPeriodOptions;
  setPeriod: (period: AggregationPeriod) => void;
  setCustomRange: (fromDate: string, toDate: string) => void;
  isCustomRangeIncomplete: boolean;
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

  const setCustomRange = useCallback(
    (nextFromDate: string, nextToDate: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('period', 'custom');
      params.set('from', nextFromDate);
      params.set('to', nextToDate);
      router.push(`?${params.toString()}`);
    },
    [router, searchParams],
  );

  const options = useMemo<AnalyticsPeriodOptions>(
    () => ({ period, fromDate, toDate }),
    [period, fromDate, toDate],
  );

  return {
    options,
    setPeriod,
    setCustomRange,
    isCustomRangeIncomplete: period === 'custom' && (!fromDate || !toDate),
  };
}
