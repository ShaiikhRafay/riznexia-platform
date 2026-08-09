'use client';

import { AGGREGATION_PERIODS, type AggregationPeriod } from '@riznexia/shared-types';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@riznexia/ui';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useAnalyticsPeriod } from '../use-analytics-period';

const PERIOD_LABEL: Record<AggregationPeriod, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
  custom: 'Custom Range',
};

// Analytics filters (F12): "Support the real backend filters only. Daily
// / Weekly / Monthly / Yearly / Custom Range. Do not invent filters." —
// all five real `AGGREGATION_PERIODS` values, including Custom Range with
// a real date-range picker (unlike F2's `PeriodSelect`, which deliberately
// excludes it — see `use-analytics-period.ts`).
export function PeriodRangeSelect() {
  const { options, setPeriod, setCustomRange } = useAnalyticsPeriod();
  const [draftFrom, setDraftFrom] = useState(options.fromDate ?? '');
  const [draftTo, setDraftTo] = useState(options.toDate ?? '');

  return (
    <div className="flex flex-wrap items-center gap-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="sm">
            {PERIOD_LABEL[options.period]}
            <ChevronDown className="h-4 w-4" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuRadioGroup
            value={options.period}
            onValueChange={(value) => setPeriod(value as AggregationPeriod)}
          >
            {AGGREGATION_PERIODS.map((period) => (
              <DropdownMenuRadioItem key={period} value={period}>
                {PERIOD_LABEL[period]}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {options.period === 'custom' ? (
        <div className="flex items-center gap-2">
          <label className="text-(--color-text-primary) flex items-center gap-2 text-sm">
            From
            <input
              type="date"
              value={draftFrom}
              onChange={(event) => setDraftFrom(event.target.value)}
              className="border-(--color-border-default) bg-(--color-bg-canvas) text-(--color-text-primary) focus-visible:ring-(--color-accent) h-9 rounded-md border px-3 text-sm focus-visible:outline-none focus-visible:ring-2"
            />
          </label>
          <label className="text-(--color-text-primary) flex items-center gap-2 text-sm">
            To
            <input
              type="date"
              value={draftTo}
              onChange={(event) => setDraftTo(event.target.value)}
              className="border-(--color-border-default) bg-(--color-bg-canvas) text-(--color-text-primary) focus-visible:ring-(--color-accent) h-9 rounded-md border px-3 text-sm focus-visible:outline-none focus-visible:ring-2"
            />
          </label>
          <Button
            size="sm"
            variant="secondary"
            disabled={!draftFrom || !draftTo}
            onClick={() =>
              setCustomRange(new Date(draftFrom).toISOString(), new Date(draftTo).toISOString())
            }
          >
            Apply
          </Button>
        </div>
      ) : null}
    </div>
  );
}
