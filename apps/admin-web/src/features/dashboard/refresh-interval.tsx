'use client';

import { createContext, useContext, useMemo, useState } from 'react';

// F2 Improvement 2 — configurable auto-refresh. `'manual'` maps to
// TanStack Query's `refetchInterval: false` (no polling, the toolbar's
// "Refresh now" button is the only way data updates); the three numeric
// options are plain millisecond intervals passed straight through to
// `refetchInterval` — no bespoke polling/timer code, per the founder's
// explicit "use TanStack Query refetch intervals" instruction.
export type RefreshIntervalValue = 'manual' | 30_000 | 60_000 | 300_000;

export interface RefreshIntervalOption {
  value: RefreshIntervalValue;
  label: string;
}

export const REFRESH_INTERVAL_OPTIONS: readonly RefreshIntervalOption[] = [
  { value: 'manual', label: 'Manual' },
  { value: 30_000, label: '30 seconds' },
  { value: 60_000, label: '1 minute' },
  { value: 300_000, label: '5 minutes' },
];

interface RefreshIntervalContextValue {
  interval: RefreshIntervalValue;
  setInterval: (value: RefreshIntervalValue) => void;
}

const RefreshIntervalContext = createContext<RefreshIntervalContextValue | null>(null);

// One shared setting for every dashboard section — the toolbar's control
// governs all of them at once, not a per-widget setting.
export function RefreshIntervalProvider({ children }: { children: React.ReactNode }) {
  const [interval, setInterval] = useState<RefreshIntervalValue>('manual');
  const value = useMemo(() => ({ interval, setInterval }), [interval]);
  return (
    <RefreshIntervalContext.Provider value={value}>{children}</RefreshIntervalContext.Provider>
  );
}

export function useRefreshInterval(): RefreshIntervalContextValue {
  const context = useContext(RefreshIntervalContext);
  if (!context) {
    throw new Error('useRefreshInterval must be used within a <RefreshIntervalProvider>');
  }
  return context;
}

/** The exact shape `useQuery({ refetchInterval })` expects — `false` disables polling. */
export function useQueryRefetchInterval(): number | false {
  const { interval } = useRefreshInterval();
  return interval === 'manual' ? false : interval;
}
