'use client';

import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type RowSelectionState,
  type VisibilityState,
} from '@tanstack/react-table';
import * as React from 'react';
import { ErrorState } from '../error-state';
import { Skeleton } from '../skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../table';
import { Checkbox } from '../checkbox';
import { DataTablePagination } from './data-table-pagination';
import { DataTableToolbar } from './data-table-toolbar';
import type { DataTableProps } from './types';

const SELECTION_COLUMN_ID = '__select__';

// The one reusable Data Table every frontend module builds its own tables
// on (founder's explicit "future modules must reuse this component").
// Generic over `TData` — this file has no idea what a Lead, a
// DiscoveryJob, or a CrmTask is; every business-specific piece (columns,
// filter options, bulk actions, empty-state copy) is supplied by the
// caller as props. Built on TanStack Table (the same vendor family as
// TanStack Query, already in the frozen stack) rather than hand-rolled —
// sorting/filtering/pagination/selection/column-visibility is
// well-trodden, substantial functionality, not the kind of small
// well-defined logic this codebase otherwise prefers to hand-roll.
export function DataTable<TData>({
  columns,
  data,
  getRowId,
  isLoading = false,
  error = null,
  onRetry,
  emptyTitle = 'No results',
  emptyDescription,
  pagination,
  sorting,
  enableGlobalFilter = false,
  globalFilterPlaceholder,
  enableColumnFilters = false,
  enableColumnVisibility = false,
  enableRowSelection = false,
  bulkActions,
  className,
}: DataTableProps<TData>) {
  const [internalSorting, setInternalSorting] = React.useState<import('./types').SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [globalFilter, setGlobalFilter] = React.useState('');
  const [internalPageSize, setInternalPageSize] = React.useState(
    pagination?.mode === 'client' ? (pagination.initialPageSize ?? 10) : 10,
  );
  const [internalPageIndex, setInternalPageIndex] = React.useState(0);

  const isServerSorting = sorting?.mode === 'server';
  const sortingState = isServerSorting ? sorting.state : internalSorting;
  const isServerPagination = pagination?.mode === 'server';

  const effectiveColumns = React.useMemo<ColumnDef<TData, unknown>[]>(() => {
    if (!enableRowSelection) {
      return columns;
    }
    const selectionColumn: ColumnDef<TData, unknown> = {
      id: SELECTION_COLUMN_ID,
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected()
              ? true
              : table.getIsSomePageRowsSelected()
                ? 'indeterminate'
                : false
          }
          onCheckedChange={(checked) => table.toggleAllPageRowsSelected(checked === true)}
          aria-label="Select all rows on this page"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(checked) => row.toggleSelected(checked === true)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 32,
    };
    return [selectionColumn, ...columns];
  }, [columns, enableRowSelection]);

  const table = useReactTable({
    data: data as TData[],
    columns: effectiveColumns,
    getRowId,
    state: {
      sorting: sortingState,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
      pagination: { pageIndex: internalPageIndex, pageSize: internalPageSize },
    },
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sortingState) : updater;
      if (isServerSorting) {
        sorting.onChange(next);
      } else {
        setInternalSorting(next);
      }
    },
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: (updater) => {
      const next =
        typeof updater === 'function'
          ? updater({ pageIndex: internalPageIndex, pageSize: internalPageSize })
          : updater;
      setInternalPageIndex(next.pageIndex);
      setInternalPageSize(next.pageSize);
    },
    enableRowSelection,
    manualSorting: isServerSorting,
    manualPagination: isServerPagination,
    globalFilterFn: 'includesString',
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: isServerSorting ? undefined : getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: isServerPagination ? undefined : getPaginationRowModel(),
  });

  const columnCount = effectiveColumns.length;
  const rows = table.getRowModel().rows;
  const showToolbar =
    enableGlobalFilter ||
    enableColumnFilters ||
    enableColumnVisibility ||
    Boolean(bulkActions?.length);

  return (
    <div className={className}>
      {showToolbar ? (
        <div className="mb-3">
          <DataTableToolbar
            table={table}
            enableGlobalFilter={enableGlobalFilter}
            globalFilterPlaceholder={globalFilterPlaceholder}
            enableColumnFilters={enableColumnFilters}
            enableColumnVisibility={enableColumnVisibility}
            bulkActions={bulkActions}
          />
        </div>
      ) : null}

      <div className="border-(--color-border-default) rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    style={header.column.id === SELECTION_COLUMN_ID ? { width: 32 } : undefined}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {error ? (
              <TableRow>
                <TableCell colSpan={columnCount} className="p-0">
                  <ErrorState error={error} onRetry={onRetry} className="border-0" />
                </TableCell>
              </TableRow>
            ) : isLoading ? (
              Array.from({ length: 5 }).map((_, rowIndex) => (
                <TableRow key={rowIndex}>
                  {effectiveColumns.map((column, columnIndex) => (
                    <TableCell key={column.id ?? columnIndex}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columnCount} className="py-10 text-center">
                  <p className="text-(--color-text-primary) text-sm font-medium">{emptyTitle}</p>
                  {emptyDescription ? (
                    <p className="text-caption text-(--color-text-secondary) mt-1">
                      {emptyDescription}
                    </p>
                  ) : null}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={row.id} data-state={row.getIsSelected() ? 'selected' : undefined}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pagination && !error ? (
        <div className="mt-3">
          <DataTablePagination table={table} config={pagination} />
        </div>
      ) : null}
    </div>
  );
}
