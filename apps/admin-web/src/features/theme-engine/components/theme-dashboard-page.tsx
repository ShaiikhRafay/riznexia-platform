'use client';

import { ErrorState, Skeleton } from '@riznexia/ui';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLead } from '@/src/features/leads/api/use-lead';
import { LeadSelect } from './lead-select';
import { ThemeStatusPanel } from './theme-status-panel';

// Theme Selection Dashboard (F7): "Select Lead" — `leadId` lives in the
// URL (bookmarkable/reload-safe), same pattern as F6's own Dashboard.
// Reuses F4's `useLead()` directly for the reload-persisted business-name
// lookup.
export function ThemeDashboardPage() {
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
      <h1 className="text-h1 text-(--color-text-primary) font-semibold">Theme Engine</h1>
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
  return <ThemeStatusPanel leadId={lead.id} businessName={lead.businessName} />;
}
