'use client';

import { ErrorState, Skeleton } from '@riznexia/ui';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLeadProposals } from '../api/use-lead-proposals';
import { CrmViewGate } from './crm-view-gate';
import { LeadSelect } from './lead-select';
import { ProposalList } from './proposal-list';

// Proposals (F10): per-lead-only backend (`GET /leads/:id/proposals`, no
// global list) — same "Select Lead" resolution as the Activities page.
// Read-only tracking only, per the brief's own explicit framing —
// DECISIONS.md D-181.
export function ProposalsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedLeadId = searchParams.get('leadId');

  function selectLead(leadId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('leadId', leadId);
    router.push(`?${params.toString()}`);
  }

  return (
    <CrmViewGate>
      <div className="flex flex-col gap-6">
        <h1 className="text-h1 text-(--color-text-primary) font-semibold">Proposals</h1>
        <LeadSelect value={selectedLeadId} onChange={(leadId) => selectLead(leadId)} />
        {selectedLeadId ? <LeadProposalsPanel leadId={selectedLeadId} /> : null}
      </div>
    </CrmViewGate>
  );
}

function LeadProposalsPanel({ leadId }: { leadId: string }) {
  const { data, isLoading, error, refetch } = useLeadProposals(leadId);

  if (isLoading) {
    return <Skeleton className="h-48 w-full" />;
  }
  if (error) {
    return <ErrorState error={error} onRetry={() => void refetch()} />;
  }
  return <ProposalList proposals={data?.items ?? []} />;
}
