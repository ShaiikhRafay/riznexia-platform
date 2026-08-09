'use client';

import { Button, ErrorState, Skeleton } from '@riznexia/ui';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useDiscoveryJob } from '../api/use-discovery-job';
import { DiscoveryImportSummary } from './discovery-import-summary';
import { DiscoveryProgress } from './discovery-progress';

export interface DiscoveryJobDetailProps {
  jobId: string;
}

// Job Details (approved F3 architecture): displays only the fields
// `GET /discovery-jobs/:id` actually returns — id/city/category/status/
// resultsCount. No createdAt, no errorMessage, no requester — those
// fields don't exist in the API response (verified against
// discovery-job-response.dto.ts), so this screen doesn't show them
// rather than inventing placeholder values.
export function DiscoveryJobDetail({ jobId }: DiscoveryJobDetailProps) {
  const { data: job, isLoading, error, refetch } = useDiscoveryJob(jobId);

  return (
    <div className="flex flex-col gap-6">
      <Button variant="ghost" size="sm" asChild className="self-start">
        <Link href="/discovery">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Discovery
        </Link>
      </Button>

      {isLoading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : job ? (
        <>
          <div>
            <h1 className="text-h1 text-(--color-text-primary) font-semibold">
              {job.city} &middot; {job.category}
            </h1>
          </div>
          <DiscoveryProgress status={job.status} />
          <DiscoveryImportSummary job={job} />
        </>
      ) : null}
    </div>
  );
}
