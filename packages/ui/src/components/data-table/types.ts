import type { ColumnDef, SortingState } from '@tanstack/react-table';
import type { ApiErrorLike } from '../error-state';

export type { ColumnDef, SortingState };

// Column-level opt-in for the toolbar's generic per-column filter UI
// (DataTable itself has no idea what a "status" or "city" is — a column
// declares its own filter shape via `meta`, and the toolbar renders
// whatever's declared). `select` needs `filterOptions`; `text` renders a
// plain debounced input.
export interface DataTableColumnMeta {
  label?: string;
  filterVariant?: 'text' | 'select';
  filterOptions?: readonly { label: string; value: string }[];
}

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unused-vars -- TanStack Table's own documented pattern for typing columnDef.meta; the type params are required by the module it augments even though this interface itself only re-exports DataTableColumnMeta's members
  interface ColumnMeta<TData, TValue> extends DataTableColumnMeta {}
}

export interface DataTableBulkAction<TData> {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  variant?: 'secondary' | 'destructive';
  onAction: (selectedRows: TData[]) => void;
}

// `client`: DataTable paginates `data` in-memory (TanStack Table's own
// `getPaginationRowModel`) — the right fit when a consumer already has
// the full dataset (e.g. a backend endpoint with no pagination params at
// all, like `GET /discovery-jobs`'s fixed top-50 list).
//
// `server`: cursor-based, matching how every paginated endpoint in this
// system's backend actually works (`cursor`/`nextCursor`, never a
// page-index/total-count model) — `data` is already just the current
// page, and Prev/Next call back into the consumer's own query.
export type DataTablePaginationConfig =
  | { mode: 'client'; pageSizeOptions?: readonly number[]; initialPageSize?: number }
  | {
      mode: 'server';
      pageSize: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
      onNextPage: () => void;
      onPreviousPage: () => void;
      isFetching?: boolean;
    };

// `client`: TanStack Table sorts `data` in-memory, state lives inside
// DataTable, nothing for the consumer to wire up.
// `server`: state is lifted — the consumer owns it (typically as a query
// key input) and re-fetches already-sorted data on change; DataTable
// never sorts `data` itself in this mode.
export type DataTableSortingConfig =
  | { mode: 'client' }
  | { mode: 'server'; state: SortingState; onChange: (state: SortingState) => void };

export interface DataTableProps<TData> {
  columns: ColumnDef<TData, unknown>[];
  data: readonly TData[];
  getRowId?: (row: TData, index: number) => string;

  isLoading?: boolean;
  error?: ApiErrorLike | null;
  onRetry?: () => void;
  emptyTitle?: string;
  emptyDescription?: string;

  pagination?: DataTablePaginationConfig;
  sorting?: DataTableSortingConfig;

  enableGlobalFilter?: boolean;
  globalFilterPlaceholder?: string;

  enableColumnFilters?: boolean;
  enableColumnVisibility?: boolean;

  enableRowSelection?: boolean;
  bulkActions?: readonly DataTableBulkAction<TData>[];

  className?: string;
}
