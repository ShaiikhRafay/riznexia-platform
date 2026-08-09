'use client';

import { leadTagSchema, type Lead, type PipelineStage } from '@riznexia/shared-types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  DataTable,
  Input,
  toast,
  type DataTableBulkAction,
  type SortingState,
} from '@riznexia/ui';
import { Tag, Trash2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useCurrentUser } from '@/src/lib/current-user-context';
import { useHasPermission } from '@/src/lib/permissions-context';
import { useBulkDeleteLeads } from '../api/use-bulk-delete-leads';
import { useBulkTagLeads } from '../api/use-bulk-tag-leads';
import { useLeads } from '../api/use-leads';
import { LEAD_LIST_COLUMNS } from './lead-list-columns';
import { LeadListFilters } from './lead-list-filters';

const PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 400;

// Lead List + Pagination (F4): `GET /leads`'s cursor pagination is
// bidirectional in the UI (Prev/Next) but forward-only in the backend (a
// single `nextCursor`, no "previous cursor") — `cursorHistory` is a stack
// of every cursor visited so far; Next pushes the response's `nextCursor`,
// Previous just steps the stack back. Changing any filter, the search
// term, or the sort resets to the first page, since a cursor from the old
// query has no defined meaning against a new one.
//
// Filters here drive `GET /leads`'s real server query params directly —
// deliberately not the shared DataTable's own built-in global/column
// filter UI, which only filters the current page's 25 already-loaded rows
// (see docs/frontend/f4-review.md and DECISIONS.md).
export function LeadListTable() {
  const searchParams = useSearchParams();
  const currentUser = useCurrentUser();

  const [searchDraft, setSearchDraft] = useState(searchParams.get('q') ?? '');
  const [debouncedSearch, setDebouncedSearch] = useState(searchDraft);
  const [stage, setStage] = useState<PipelineStage | 'all'>('all');
  const [tag, setTag] = useState('');
  const [assignedToMe, setAssignedToMe] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [cursorHistory, setCursorHistory] = useState<(string | undefined)[]>([undefined]);
  const [pageIndex, setPageIndex] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(searchDraft), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [searchDraft]);

  const trimmedSearch = debouncedSearch.trim();
  const effectiveQ = trimmedSearch.length >= 2 ? trimmedSearch : undefined;
  const effectiveStage = stage === 'all' ? undefined : stage;
  const trimmedTag = tag.trim();
  const effectiveTag = trimmedTag ? trimmedTag : undefined;
  const effectiveAssignedTo = assignedToMe ? currentUser.id : undefined;
  const sortField = sorting[0];
  const effectiveSort = sortField
    ? sortField.desc
      ? `-${sortField.id}`
      : sortField.id
    : undefined;

  const filterKey = JSON.stringify([
    effectiveQ,
    effectiveStage,
    effectiveTag,
    effectiveAssignedTo,
    effectiveSort,
  ]);
  const previousFilterKeyRef = useRef(filterKey);
  useEffect(() => {
    if (previousFilterKeyRef.current !== filterKey) {
      previousFilterKeyRef.current = filterKey;
      setCursorHistory([undefined]);
      setPageIndex(0);
    }
  }, [filterKey]);

  const canWrite = useHasPermission('leads:write');
  const canDelete = useHasPermission('leads:delete');

  const { data, isLoading, isFetching, error, refetch } = useLeads({
    cursor: cursorHistory[pageIndex],
    limit: PAGE_SIZE,
    stage: effectiveStage,
    tag: effectiveTag,
    assignedTo: effectiveAssignedTo,
    q: effectiveQ,
    sort: effectiveSort,
  });

  const [pendingDeleteRows, setPendingDeleteRows] = useState<Lead[] | null>(null);
  const [pendingTagRows, setPendingTagRows] = useState<Lead[] | null>(null);
  const [tagDraft, setTagDraft] = useState('');
  const [tagError, setTagError] = useState<string | null>(null);

  const bulkDelete = useBulkDeleteLeads();
  const bulkTag = useBulkTagLeads();

  const bulkActions: DataTableBulkAction<Lead>[] = [];
  if (canWrite) {
    bulkActions.push({
      id: 'add-tag',
      label: 'Add tag',
      icon: Tag,
      variant: 'secondary',
      onAction: (rows) => {
        setPendingTagRows(rows);
        setTagDraft('');
        setTagError(null);
      },
    });
  }
  if (canDelete) {
    bulkActions.push({
      id: 'delete',
      label: 'Delete',
      icon: Trash2,
      variant: 'destructive',
      onAction: (rows) => setPendingDeleteRows(rows),
    });
  }

  async function confirmBulkDelete() {
    if (!pendingDeleteRows) {
      return;
    }
    const rows = pendingDeleteRows;
    setPendingDeleteRows(null);
    const result = await bulkDelete.mutateAsync(rows);
    if (result.failed === 0) {
      toast.success(`Deleted ${result.succeeded} lead${result.succeeded === 1 ? '' : 's'}`);
    } else {
      toast.error(
        `Deleted ${result.succeeded}, failed to delete ${result.failed} — ${rows.length} individual requests, not one atomic operation`,
      );
    }
  }

  async function confirmBulkTag() {
    if (!pendingTagRows) {
      return;
    }
    const parsed = leadTagSchema.safeParse(tagDraft);
    if (!parsed.success) {
      setTagError(parsed.error.issues[0]?.message ?? 'Invalid tag');
      return;
    }
    const rows = pendingTagRows;
    setPendingTagRows(null);
    const result = await bulkTag.mutateAsync({ leads: rows, tag: parsed.data });
    if (result.failed === 0) {
      toast.success(
        `Tagged ${result.succeeded} lead${result.succeeded === 1 ? '' : 's'} with "${parsed.data}"`,
      );
    } else {
      toast.error(
        `Tagged ${result.succeeded}, failed on ${result.failed} — ${rows.length} individual requests, not one atomic operation`,
      );
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <LeadListFilters
        search={searchDraft}
        onSearchChange={setSearchDraft}
        stage={stage}
        onStageChange={setStage}
        tag={tag}
        onTagChange={setTag}
        assignedToMe={assignedToMe}
        onAssignedToMeChange={setAssignedToMe}
      />

      <DataTable
        columns={LEAD_LIST_COLUMNS}
        data={data?.items ?? []}
        getRowId={(row) => row.id}
        isLoading={isLoading}
        error={error}
        onRetry={() => void refetch()}
        emptyTitle="No leads found"
        emptyDescription="Try adjusting your filters, or create a new lead."
        sorting={{ mode: 'server', state: sorting, onChange: setSorting }}
        pagination={{
          mode: 'server',
          pageSize: PAGE_SIZE,
          hasNextPage: !!data?.nextCursor,
          hasPreviousPage: pageIndex > 0,
          onNextPage: () => {
            if (data?.nextCursor) {
              const nextCursor = data.nextCursor;
              setCursorHistory((prev) => [...prev.slice(0, pageIndex + 1), nextCursor]);
              setPageIndex((index) => index + 1);
            }
          },
          onPreviousPage: () => setPageIndex((index) => Math.max(0, index - 1)),
          isFetching,
        }}
        enableColumnVisibility
        enableRowSelection={canWrite || canDelete}
        bulkActions={bulkActions}
      />

      <AlertDialog
        open={!!pendingDeleteRows}
        onOpenChange={(open) => !open && setPendingDeleteRows(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {pendingDeleteRows?.length ?? 0} lead(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              This runs {pendingDeleteRows?.length ?? 0} individual delete requests, not one atomic
              operation — some may fail independently. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => void confirmBulkDelete()}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!pendingTagRows}
        onOpenChange={(open) => !open && setPendingTagRows(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Add tag to {pendingTagRows?.length ?? 0} lead(s)</AlertDialogTitle>
            <AlertDialogDescription>
              Runs {pendingTagRows?.length ?? 0} individual update requests, not one atomic
              operation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={tagDraft}
            onChange={(event) => {
              setTagDraft(event.target.value);
              setTagError(null);
            }}
            placeholder="e.g. vip"
            aria-label="Tag to add"
            aria-invalid={!!tagError}
          />
          {tagError ? (
            <p className="text-(--color-danger) text-xs font-medium">{tagError}</p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmBulkTag()}>Add Tag</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
