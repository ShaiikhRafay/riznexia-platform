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
import { useDashboardPeriod } from '../use-dashboard-period';

// `custom` is a selectable value the Aggregation Engine's own contract
// supports, but this toolbar has no date-range picker yet — selecting it
// without `from`/`to` in the URL would hit `INVALID_AGGREGATION_RANGE`, so
// it's deliberately left out of this control until a future module adds
// a range picker, rather than shipping a selectable option that always 400s.
const SELECTABLE_PERIODS = AGGREGATION_PERIODS.filter((period) => period !== 'custom');

const PERIOD_LABEL: Record<AggregationPeriod, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
  custom: 'Custom',
};

export function PeriodSelect() {
  const { options, setPeriod } = useDashboardPeriod();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="sm">
          {PERIOD_LABEL[options.period]}
          <ChevronDown className="h-4 w-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup
          value={options.period}
          onValueChange={(value) => setPeriod(value as AggregationPeriod)}
        >
          {SELECTABLE_PERIODS.map((period) => (
            <DropdownMenuRadioItem key={period} value={period}>
              {PERIOD_LABEL[period]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
