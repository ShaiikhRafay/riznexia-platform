'use client';

import type { Table } from '@tanstack/react-table';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '../button';
import type { DataTablePaginationConfig } from './types';

export interface DataTablePaginationProps<TData> {
  table: Table<TData>;
  config: DataTablePaginationConfig;
}

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

export function DataTablePagination<TData>({ table, config }: DataTablePaginationProps<TData>) {
  if (config.mode === 'server') {
    return (
      <div className="flex items-center justify-between gap-3">
        <span className="text-caption text-(--color-text-secondary)">
          {config.pageSize} rows per page
        </span>
        <div className="flex items-center gap-2">
          {config.isFetching ? (
            <Loader2
              className="text-(--color-text-secondary) h-4 w-4 animate-spin"
              aria-hidden="true"
            />
          ) : null}
          <Button
            variant="secondary"
            size="sm"
            onClick={config.onPreviousPage}
            disabled={!config.hasPreviousPage}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Previous
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={config.onNextPage}
            disabled={!config.hasNextPage}
          >
            Next
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    );
  }

  const pageCount = table.getPageCount();
  const pageIndex = table.getState().pagination.pageIndex;
  const pageSizeOptions = config.pageSizeOptions ?? DEFAULT_PAGE_SIZE_OPTIONS;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="text-caption text-(--color-text-secondary) flex items-center gap-2">
        <span>Rows per page</span>
        <select
          value={table.getState().pagination.pageSize}
          onChange={(event) => table.setPageSize(Number(event.target.value))}
          aria-label="Rows per page"
          className="border-(--color-border-default) bg-(--color-bg-canvas) text-(--color-text-primary) h-8 rounded-md border px-2 text-sm"
        >
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>
      <span className="text-caption text-(--color-text-secondary)">
        Page {pageCount === 0 ? 0 : pageIndex + 1} of {pageCount}
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Previous
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
