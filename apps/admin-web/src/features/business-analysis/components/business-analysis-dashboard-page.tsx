'use client';

import { ErrorState, Skeleton } from '@riznexia/ui';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLead } from '@/src/features/leads/api/use-lead';
import { BusinessAnalysisStatusPanel } from './business-analysis-status-panel';
import { LeadSelect } from './lead-select';

// Business Analysis Dashboard (F6): "Select Lead" (`leadId` lives in the
// URL, bookmarkable/shareable/reload-safe, same pattern as F2's
// `?period=` and F4's `?q=`), then the selected lead's status panel.
// Reuses F4's `useLead()` directly for the reload-persisted lookup
// (rather than only trusting `LeadSelect`'s own in-memory selection,
// which wouldn't survive a page reload with `?leadId=` already in the
// URL).
export function BusinessAnalysisDashboardPage() {
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
      <h1 className="text-h1 text-(--color-text-primary) font-semibold">Business Analysis</h1>
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
  return <BusinessAnalysisStatusPanel leadId={lead.id} businessName={lead.businessName} />;
}
