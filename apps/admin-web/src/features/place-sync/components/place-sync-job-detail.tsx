'use client';

import type { PlaceSyncJob } from '@riznexia/shared-types';
import { Button, ErrorState, Skeleton, StatusBadge } from '@riznexia/ui';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { usePlaceSyncJob } from '../api/use-place-sync-job';
import { PLACE_SYNC_STATUS_PRESENTATION } from '../status';
import { PlaceSyncProgress } from './place-sync-progress';

export interface PlaceSyncJobDetailProps {
  jobId: string;
}

function formatTimestamp(value: string | null): string {
  return value ? new Date(value).toLocaleString() : '—';
}

// "Last Updated" (founder-approved resolution): `PlaceSyncJob` has no
// `updatedAt` field, and `createdAt` isn't even part of the API response
// — only `startedAt`/`finishedAt` exist. Derived from the most recent
// real timestamp available: `finishedAt` if the job is terminal, else
// `startedAt` if it has begun running, else there is genuinely no
// timestamp yet for a still-queued job.
function lastUpdatedLabel(job: PlaceSyncJob): string {
  if (job.finishedAt) {
    return new Date(job.finishedAt).toLocaleString();
  }
  if (job.startedAt) {
    return new Date(job.startedAt).toLocaleString();
  }
  return 'No activity yet';
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-(--color-text-secondary)">{label}</span>
      <span className="text-(--color-text-primary)">{children}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-(--color-border-default) bg-(--color-bg-surface) flex flex-col gap-3 rounded-lg border p-4">
      <h2 className="text-h2 text-(--color-text-primary) font-semibold">{title}</h2>
      {children}
    </section>
  );
}

// Sync Job Details (F5): displays only the fields `GET /place-sync-jobs/:id`
// actually returns (verified against place-sync-job-response.dto.ts) —
// no "Current Page Token" section exists here at all, since no such field
// is returned anywhere (Google's page-token pagination is consumed and
// discarded entirely within one server-side run, never persisted to the
// job row) — omitting an unbuildable section, not inventing a placeholder
// for it. "Processed Count" is a computed sum of the three real per-
// outcome counters (`businessesCreated + businessesUpdated +
// businessesFailed`) — the backend has no single `processedCount` field,
// but this total is genuine arithmetic over real data, not fabricated.
export function PlaceSyncJobDetail({ jobId }: PlaceSyncJobDetailProps) {
  const { data: job, isLoading, error, refetch } = usePlaceSyncJob(jobId);

  return (
    <div className="flex flex-col gap-6">
      <Button variant="ghost" size="sm" asChild className="self-start">
        <Link href="/discovery/sync">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Place Sync
        </Link>
      </Button>

      {isLoading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : job ? (
        <>
          <h1 className="text-h1 text-(--color-text-primary) font-semibold">
            {job.city ?? `${job.latitude}, ${job.longitude}`}
          </h1>

          <PlaceSyncProgress status={job.status} />

          <div className="grid gap-4 md:grid-cols-2">
            <Section title="Job Status">
              <Field label="Status">
                <StatusBadge
                  variant={PLACE_SYNC_STATUS_PRESENTATION[job.status].variant}
                  label={PLACE_SYNC_STATUS_PRESENTATION[job.status].label}
                />
              </Field>
              <Field label="Last Updated">{lastUpdatedLabel(job)}</Field>
              {job.errorMessage ? (
                <Field label="Error Message">
                  <span className="text-(--color-danger)">{job.errorMessage}</span>
                </Field>
              ) : null}
            </Section>

            <Section title="Search Parameters">
              <Field label="City">{job.city ?? '—'}</Field>
              <Field label="Category">{job.category ?? '—'}</Field>
              <Field label="Keyword">{job.keyword ?? '—'}</Field>
              <Field label="Latitude">{job.latitude ?? '—'}</Field>
              <Field label="Longitude">{job.longitude ?? '—'}</Field>
              <Field label="Radius (meters)">{job.radiusMeters ?? '—'}</Field>
            </Section>

            <Section title="Counts">
              <Field label="Processed Count">
                {job.businessesCreated + job.businessesUpdated + job.businessesFailed}
              </Field>
              <Field label="Imported Count">{job.businessesCreated}</Field>
              <Field label="Updated Count">{job.businessesUpdated}</Field>
              <Field label="Failed Count">{job.businessesFailed}</Field>
            </Section>

            <Section title="Timeline">
              <Field label="Started At">{formatTimestamp(job.startedAt)}</Field>
              <Field label="Completed At">{formatTimestamp(job.finishedAt)}</Field>
              <Field label="Duration">{job.duration !== null ? `${job.duration}s` : '—'}</Field>
            </Section>
          </div>
        </>
      ) : null}
    </div>
  );
}
