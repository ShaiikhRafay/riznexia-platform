import type { SalesProposal } from '@riznexia/shared-types';
import { StatusBadge } from '@riznexia/ui';
import { PROPOSAL_STATUS_PRESENTATION } from '../status';

// Proposals — read-only tracking (F10): "Display: Proposal List, Version,
// Status, Sent Date, Viewed Date, Accepted Date, Rejected Date. Read-only
// tracking. Do not generate proposals. Do not edit proposal content
// unless backend supports it." The backend has no content-editing
// endpoint at all (confirmed against the controller's own doc comment —
// "no DELETE and no content-editing PATCH... every version endures once
// created"), and this section's own brief text is explicit about being
// read-only tracking — so no create/edit/status-change affordance exists
// anywhere in this component, only display (DECISIONS.md D-181). Shared
// between Lead CRM Details and the standalone Proposals page.
export function ProposalList({ proposals }: { proposals: readonly SalesProposal[] }) {
  if (proposals.length === 0) {
    return <p className="text-(--color-text-secondary) text-sm">No proposals yet.</p>;
  }
  return (
    <ul className="flex flex-col gap-3">
      {proposals.map((proposal) => {
        const presentation = PROPOSAL_STATUS_PRESENTATION[proposal.status];
        return (
          <li key={proposal.id} className="border-(--color-border-default) rounded-lg border p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-(--color-text-primary) text-sm font-medium">
                Version {proposal.version}
              </span>
              <StatusBadge variant={presentation.variant} label={presentation.label} />
            </div>
            <dl className="text-(--color-text-secondary) mt-2 grid grid-cols-2 gap-1 text-xs">
              <div>
                <dt className="inline">Sent: </dt>
                <dd className="inline">
                  {proposal.sentAt ? new Date(proposal.sentAt).toLocaleString() : '—'}
                </dd>
              </div>
              <div>
                <dt className="inline">Viewed: </dt>
                <dd className="inline">
                  {proposal.viewedAt ? new Date(proposal.viewedAt).toLocaleString() : '—'}
                </dd>
              </div>
              <div>
                <dt className="inline">Accepted: </dt>
                <dd className="inline">
                  {proposal.acceptedAt ? new Date(proposal.acceptedAt).toLocaleString() : '—'}
                </dd>
              </div>
              <div>
                <dt className="inline">Rejected: </dt>
                <dd className="inline">
                  {proposal.rejectedAt ? new Date(proposal.rejectedAt).toLocaleString() : '—'}
                </dd>
              </div>
            </dl>
          </li>
        );
      })}
    </ul>
  );
}
