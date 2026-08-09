'use client';

import type { Column } from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../button';

export interface DataTableColumnHeaderProps<TData, TValue> {
  column: Column<TData, TValue>;
  title: string;
  className?: string;
}

// Works identically whether the column's sort is client-computed or
// server-driven (`manualSorting`) — `column.toggleSorting()`/
// `getIsSorted()` are the same TanStack Table API either way; only
// `useDataTable`'s own setup (data-table.tsx) decides which one is active.
export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return (
      <span className={cn('text-caption text-(--color-text-secondary) font-medium', className)}>
        {title}
      </span>
    );
  }

  const sorted = column.getIsSorted();

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn(
        'text-caption text-(--color-text-secondary) hover:text-(--color-text-primary) -ml-3 h-8 gap-1.5 font-medium',
        className,
      )}
      onClick={() => column.toggleSorting(sorted === 'asc')}
      aria-label={`Sort by ${title}${sorted ? `, currently ${sorted === 'asc' ? 'ascending' : 'descending'}` : ''}`}
    >
      {title}
      {sorted === 'asc' ? (
        <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
      ) : sorted === 'desc' ? (
        <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
      ) : (
        <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" aria-hidden="true" />
      )}
    </Button>
  );
}
