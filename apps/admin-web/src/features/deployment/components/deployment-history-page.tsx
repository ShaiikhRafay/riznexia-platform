'use client';

import { Button, DataTable, ErrorState, Skeleton } from '@riznexia/ui';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useLead } from '@/src/features/leads/api/use-lead';
import { useDeployments } from '../api/use-deployments';
import { buildDeploymentHistoryColumns } from './deployment-history-columns';

const PAGE_SIZE = 25;

export interface DeploymentHistoryPageProps {
  leadId: string;
}

// Deployment History (F11): `GET /leads/:id/deployments` — cursor-paginated
// server-side, same bidirectional Prev/Next-over-a-forward-only-cursor
// pattern F10's Tasks page established.
export function DeploymentHistoryPage({ leadId }: DeploymentHistoryPageProps) {
  const { data: lead } = useLead(leadId);
  const [cursorHistory, setCursorHistory] = useState<(string | undefined)[]>([undefined]);
  const [pageIndex, setPageIndex] = useState(0);

  const { data, isLoading, isFetching, error, refetch } = useDeployments(leadId, {
    cursor: cursorHistory[pageIndex],
    limit: PAGE_SIZE,
  });

  const columns = useMemo(() => buildDeploymentHistoryColumns(leadId), [leadId]);

  if (error) {
    return <ErrorState error={error} onRetry={() => void refetch()} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <Button variant="ghost" size="sm" asChild className="self-start">
        <Link href={`/deployment?leadId=${leadId}`}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Deployment Dashboard
        </Link>
      </Button>
      <h1 className="text-h1 text-(--color-text-primary) font-semibold">
        Deployment History{lead ? ` — ${lead.businessName}` : ''}
      </h1>
      {!lead ? (
        <Skeleton className="h-8 w-64" />
      ) : (
        <DataTable
          columns={columns}
          data={data?.items ?? []}
          getRowId={(row) => row.id}
          isLoading={isLoading}
          emptyTitle="No deployments found"
          emptyDescription="This lead has not had any deployments requested yet."
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
        />
      )}
    </div>
  );
}
