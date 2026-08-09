import type { DiscoveryJob } from '@riznexia/shared-types';

// Import Summary (approved F3 architecture): `resultsCount` only — the
// backend has no endpoint linking a job to the businesses it found, so
// this is deliberately a count, not a list (a business list would also
// stray into Lead Management, explicitly out of scope for F3).
export function DiscoveryImportSummary({ job }: { job: DiscoveryJob }) {
  if (job.status !== 'completed') {
    return null;
  }

  return (
    <div className="border-(--color-border-default) bg-(--color-bg-surface) rounded-lg border p-4">
      <p className="text-caption text-(--color-text-secondary) font-medium">Import Summary</p>
      <p className="text-display text-(--color-text-primary) mt-1 font-semibold">
        {job.resultsCount}
      </p>
      <p className="text-(--color-text-secondary) text-sm">
        {job.resultsCount === 1 ? 'business' : 'businesses'} discovered in {job.city} for &ldquo;
        {job.category}&rdquo;
      </p>
    </div>
  );
}
