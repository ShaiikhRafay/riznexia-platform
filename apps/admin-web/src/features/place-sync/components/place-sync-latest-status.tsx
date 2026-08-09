'use client';

import { Button, ErrorState, Skeleton } from '@riznexia/ui';
import { RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { usePlaceSyncJobs } from '../api/use-place-sync-jobs';
import { PlaceSyncProgress } from './place-sync-progress';

// "Latest synchronization status" + "Progress summary" (Dashboard, F5):
// `GET /place-sync-jobs` is already ordered `createdAt desc`, so the most
// recent job is simply the first item — no separate endpoint or derived
// state needed. Manual refresh (not auto-polling), matching Discovery
// History's own established UX for this same "fixed top-50 list" backend
// shape.
export function PlaceSyncLatestStatus() {
  const { data, isLoading, isFetching, error, refetch } = usePlaceSyncJobs();
  const latest = data?.[0];

  return (
    <section className="border-(--color-border-default) bg-(--color-bg-surface) flex flex-col gap-3 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-h2 text-(--color-text-primary) font-semibold">
          Latest Synchronization
        </h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => void refetch()}
          aria-label="Refresh"
          disabled={isFetching}
        >
          <RefreshCw
            className={isFetching ? 'h-4 w-4 animate-spin' : 'h-4 w-4'}
            aria-hidden="true"
          />
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : !latest ? (
        <p className="text-(--color-text-secondary) text-sm">
          No synchronizations have been run yet.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <PlaceSyncProgress status={latest.status} />
          <p className="text-(--color-text-secondary) text-sm">
            Found {latest.businessesFound} &middot; Created {latest.businessesCreated} &middot;
            Updated {latest.businessesUpdated} &middot; Failed {latest.businessesFailed}
          </p>
          <Link
            href={`/discovery/sync/${latest.id}`}
            className="text-(--color-accent) self-start text-sm font-medium hover:underline"
          >
            View details
          </Link>
        </div>
      )}
    </section>
  );
}
