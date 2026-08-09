'use client';

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@riznexia/ui';
import { ChevronDown, RefreshCw } from 'lucide-react';
import {
  REFRESH_INTERVAL_OPTIONS,
  useRefreshInterval,
  type RefreshIntervalValue,
} from '../refresh-interval';

// F2 Improvement 2 — the one control governing every dashboard section's
// polling. `String(value)` round-trips through Radix's string-only radio
// value API; `'manual'` stays `'manual'`, and the three numeric options
// parse back with `Number(...)` on change.
export function RefreshIntervalSelect() {
  const { interval, setInterval } = useRefreshInterval();

  function handleValueChange(value: string) {
    const next: RefreshIntervalValue =
      value === 'manual' ? 'manual' : (Number(value) as RefreshIntervalValue);
    setInterval(next);
  }

  const activeLabel =
    REFRESH_INTERVAL_OPTIONS.find((option) => option.value === interval)?.label ?? 'Manual';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="sm">
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          {activeLabel}
          <ChevronDown className="h-4 w-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup value={String(interval)} onValueChange={handleValueChange}>
          {REFRESH_INTERVAL_OPTIONS.map((option) => (
            <DropdownMenuRadioItem key={option.value} value={String(option.value)}>
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
