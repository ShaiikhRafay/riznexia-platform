'use client';

import { ErrorState, Skeleton } from '@riznexia/ui';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLead } from '@/src/features/leads/api/use-lead';
import { LeadSelect } from './lead-select';
import { PreviewStatusPanel } from './preview-status-panel';

// Website Preview Dashboard (F9): "Select Lead" — `leadId` lives in the
// URL (bookmarkable/reload-safe), same pattern as F6/F7/F8's own
// Dashboards. Reuses F4's `useLead()` directly.
export function WebsitePreviewDashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedLeadId = searchParams.get('leadId');

  function selectLead(leadId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('leadId', leadId);
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-h1 text-(--color-text-primary) font-semibold">Website Preview</h1>
      <LeadSelect value={selectedLeadId} onChange={(leadId) => selectLead(leadId)} />
      {selectedLeadId ? <SelectedLeadPanel leadId={selectedLeadId} /> : null}
    </div>
  );
}

function SelectedLeadPanel({ leadId }: { leadId: string }) {
  const { data: lead, isLoading, error, refetch } = useLead(leadId);

  if (isLoading) {
    return <Skeleton className="h-32 w-full" />;
  }
  if (error) {
    return <ErrorState error={error} onRetry={() => void refetch()} />;
  }
  if (!lead) {
    return null;
  }
  return <PreviewStatusPanel leadId={lead.id} businessName={lead.businessName} />;
}
