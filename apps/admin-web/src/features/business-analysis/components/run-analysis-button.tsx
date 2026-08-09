'use client';

import { Button, toast } from '@riznexia/ui';
import { PermissionGate } from '@/src/components/auth/permission-gate';
import { ApiError } from '@/src/lib/api-client';
import { useTriggerBusinessAnalysis } from '../api/use-trigger-business-analysis';

export interface RunAnalysisButtonProps {
  leadId: string;
  /** Whether an analysis already exists for this lead — switches the label from "Run" to "Re-run"; the request itself is identical either way (see DECISIONS.md). */
  hasExistingAnalysis: boolean;
}

// Run/Re-run Analysis (F6): one button, one mutation — gated on
// `business:analyze` (hidden, not disabled, when missing). "Cache
// status" (founder brief: "Display cache status if returned by backend")
// is shown as a one-time toast right after triggering, inferred from
// whether the response's own `status` is already `completed` (cache hit
// — nothing to poll, the fingerprint hadn't changed) or `pending` (cache
// miss — a new analysis actually started) — not a persistent field on
// Analysis Details, since a later GET can't retroactively tell whether
// the row it returns was originally a hit or a miss.
export function RunAnalysisButton({ leadId, hasExistingAnalysis }: RunAnalysisButtonProps) {
  const trigger = useTriggerBusinessAnalysis(leadId);

  async function handleClick() {
    try {
      const analysis = await trigger.mutateAsync();
      if (analysis.status === 'completed') {
        toast.success(
          'Already up to date — showing the cached analysis (no new AI call was made).',
        );
      } else {
        toast.success('Analysis started.');
      }
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Could not start the analysis.';
      toast.error(message);
    }
  }

  return (
    <PermissionGate permission="business:analyze">
      <Button onClick={() => void handleClick()} loading={trigger.isPending}>
        {hasExistingAnalysis ? 'Re-run Analysis' : 'Run AI Analysis'}
      </Button>
    </PermissionGate>
  );
}
