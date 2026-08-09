'use client';

import type { Column, Table } from '@tanstack/react-table';
import { Columns3, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../button';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../dropdown-menu';
import { Input } from '../input';
import type { DataTableBulkAction } from './types';

export interface DataTableToolbarProps<TData> {
  table: Table<TData>;
  enableGlobalFilter?: boolean;
  globalFilterPlaceholder?: string;
  enableColumnFilters?: boolean;
  enableColumnVisibility?: boolean;
  bulkActions?: readonly DataTableBulkAction<TData>[];
}

// Entirely generic — knows nothing about what columns/filters/actions a
// consumer defines, only the shapes DataTable's own props describe. When
// rows are selected and bulk actions exist, the toolbar swaps to the
// selection bar instead of search/filters — the two are never shown at
// once, matching most data-table UX conventions (docs/17 §6's Data Table
// component, extended here).
export function DataTableToolbar<TData>({
  table,
  enableGlobalFilter,
  globalFilterPlaceholder,
  enableColumnFilters,
  enableColumnVisibility,
  bulkActions,
}: DataTableToolbarProps<TData>) {
  const selectedRows = table.getSelectedRowModel().rows;
  const hasBulkActions = Boolean(bulkActions && bulkActions.length > 0);

  if (selectedRows.length > 0 && hasBulkActions) {
    return (
      <div className="border-(--color-border-default) bg-(--color-bg-surface) flex flex-wrap items-center justify-between gap-3 rounded-md border px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-(--color-text-primary) text-sm font-medium">
            {selectedRows.length} selected
          </span>
          <Button variant="ghost" size="sm" onClick={() => table.resetRowSelection()}>
            <X className="h-4 w-4" aria-hidden="true" />
            Clear
          </Button>
        </div>
        <div className="flex items-center gap-2">
          {(bulkActions ?? []).map((action) => (
            <Button
              key={action.id}
              variant={action.variant === 'destructive' ? 'destructive' : 'secondary'}
              size="sm"
              onClick={() => action.onAction(selectedRows.map((row) => row.original))}
            >
              {action.icon ? <action.icon className="h-4 w-4" aria-hidden="true" /> : null}
              {action.label}
            </Button>
          ))}
        </div>
      </div>
    );
  }

  const filterableColumns = enableColumnFilters
    ? table
        .getAllColumns()
        .filter((column) => column.getCanFilter() && column.columnDef.meta?.filterVariant)
    : [];

  return (
    <div className="flex flex-wrap items-center gap-2">
      {enableGlobalFilter ? (
        <Input
          value={(table.getState().globalFilter as string | undefined) ?? ''}
          onChange={(event) => table.setGlobalFilter(event.target.value)}
          placeholder={globalFilterPlaceholder ?? 'Search…'}
          className="h-9 max-w-xs"
          aria-label="Search"
        />
      ) : null}
      {filterableColumns.map((column) => (
        <ColumnFilter key={column.id} column={column} />
      ))}
      {enableColumnVisibility ? (
        <div className="ml-auto">
          <ColumnVisibilityMenu table={table} />
        </div>
      ) : null}
    </div>
  );
}

function ColumnFilter<TData>({ column }: { column: Column<TData, unknown> }) {
  const meta = column.columnDef.meta;
  const label = meta?.label ?? column.id;
  const value = column.getFilterValue();

  if (meta?.filterVariant === 'select') {
    return (
      <select
        value={(value as string | undefined) ?? ''}
        onChange={(event) => column.setFilterValue(event.target.value || undefined)}
        aria-label={`Filter by ${label}`}
        className={cn(
          'border-(--color-border-default) bg-(--color-bg-canvas) text-(--color-text-primary) h-9 rounded-md border px-2 text-sm',
          'focus-visible:ring-(--color-accent) focus-visible:outline-none focus-visible:ring-2',
        )}
      >
        <option value="">{label}: All</option>
        {(meta.filterOptions ?? []).map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <Input
      value={(value as string | undefined) ?? ''}
      onChange={(event) => column.setFilterValue(event.target.value || undefined)}
      placeholder={`Filter ${label}…`}
      aria-label={`Filter by ${label}`}
      className="h-9 max-w-40"
    />
  );
}

function ColumnVisibilityMenu<TData>({ table }: { table: Table<TData> }) {
  const hideableColumns = table.getAllColumns().filter((column) => column.getCanHide());
  if (hideableColumns.length === 0) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary" size="sm">
          <Columns3 className="h-4 w-4" aria-hidden="true" />
          Columns
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {hideableColumns.map((column) => (
          <DropdownMenuCheckboxItem
            key={column.id}
            checked={column.getIsVisible()}
            onCheckedChange={(checked) => column.toggleVisibility(checked)}
            onSelect={(event) => event.preventDefault()}
          >
            {column.columnDef.meta?.label ?? column.id}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
