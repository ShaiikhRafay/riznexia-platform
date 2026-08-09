'use client';

import { Button, ErrorState, Skeleton, toast } from '@riznexia/ui';
import { useState } from 'react';
import { ApiError } from '@/src/lib/api-client';
import { useBoardLeads } from '../api/use-board-leads';
import { useBoardLeadsCrm } from '../api/use-board-leads-crm';
import { useSalesStages } from '../api/use-sales-stages';
import { useTransitionStageAny } from '../api/use-transition-stage-any';
import { CrmViewGate } from './crm-view-gate';
import { LostReasonDialog } from './lost-reason-dialog';
import { StageColumn } from './stage-column';

// Pipeline Board (F10, founder-approved resolution — DECISIONS.md D-177):
// bounded/paginated real board. Leads accumulate via `useBoardLeads()`
// (infinite query over `GET /leads`, "Load More" pages in further leads
// across every column); each loaded lead's stage/deal-value/owner comes
// from a real `GET /leads/:id/crm` (`useBoardLeadsCrm`, batched). Stage
// movement is real drag-and-drop — dropping a card fires the one real
// `POST /leads/:id/crm/stage` endpoint, special-cased only for `isLost`
// stages, which require a lost-reason first. "Never fake drag & drop":
// every drop, and every explicit stage-picker change, calls the same real
// mutation — there is no local-only reordering.
export function PipelineBoardPage() {
  const {
    data: stagesData,
    isLoading: stagesLoading,
    error: stagesError,
    refetch: refetchStages,
  } = useSalesStages();
  const boardLeads = useBoardLeads();
  const leads = (boardLeads.data?.pages ?? []).flatMap((page) => page.items);
  const leadIds = leads.map((lead) => lead.id);
  const crmByLeadId = useBoardLeadsCrm(leadIds);

  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null);
  const [pendingLostTransition, setPendingLostTransition] = useState<{
    leadId: string;
    stageId: string;
  } | null>(null);
  const transitionStage = useTransitionStageAny();

  function transitionLead(leadId: string, stageId: string, lostReasonId?: string) {
    const targetStage = stagesData?.find((stage) => stage.id === stageId);
    if (targetStage?.isLost && !lostReasonId) {
      setPendingLostTransition({ leadId, stageId });
      return;
    }
    void doTransition(leadId, stageId, lostReasonId);
  }

  async function doTransition(leadId: string, stageId: string, lostReasonId?: string) {
    try {
      await transitionStage.mutateAsync({ leadId, stageId, lostReasonId });
      toast.success('Lead moved');
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Could not move this lead.';
      toast.error(message);
    }
  }

  if (stagesLoading) {
    return (
      <CrmViewGate>
        <Skeleton className="h-96 w-full" />
      </CrmViewGate>
    );
  }
  if (stagesError) {
    return (
      <CrmViewGate>
        <ErrorState error={stagesError} onRetry={() => void refetchStages()} />
      </CrmViewGate>
    );
  }

  const stages = stagesData ?? [];

  return (
    <CrmViewGate>
      <div className="flex flex-col gap-6">
        <h1 className="text-h1 text-(--color-text-primary) font-semibold">Pipeline Board</h1>
        <p className="text-(--color-text-secondary) text-sm">
          Showing {leads.length} loaded lead{leads.length === 1 ? '' : 's'}
          {boardLeads.hasNextPage ? ' — more available' : ''}. Drag a card to another column, or use
          its stage picker.
        </p>

        <div className="flex gap-4 overflow-x-auto pb-2">
          {stages.map((stage) => (
            <StageColumn
              key={stage.id}
              stage={stage}
              leads={leads.filter((lead) => crmByLeadId[lead.id]?.stageId === stage.id)}
              crmByLeadId={crmByLeadId}
              allStages={stages}
              isDropTarget={dragOverStageId === stage.id}
              onDragOver={() => setDragOverStageId(stage.id)}
              onDragLeave={() =>
                setDragOverStageId((current) => (current === stage.id ? null : current))
              }
              onDrop={(leadId) => {
                setDragOverStageId(null);
                transitionLead(leadId, stage.id);
              }}
              onDragStart={() => undefined}
              onDragEnd={() => setDragOverStageId(null)}
              onMoveToStage={(leadId, stageId) => transitionLead(leadId, stageId)}
            />
          ))}
        </div>

        {boardLeads.hasNextPage ? (
          <Button
            variant="secondary"
            onClick={() => void boardLeads.fetchNextPage()}
            loading={boardLeads.isFetchingNextPage}
            className="self-start"
          >
            Load More Leads
          </Button>
        ) : null}
      </div>

      <LostReasonDialog
        open={!!pendingLostTransition}
        onCancel={() => setPendingLostTransition(null)}
        onConfirm={(lostReasonId) => {
          if (pendingLostTransition) {
            void doTransition(
              pendingLostTransition.leadId,
              pendingLostTransition.stageId,
              lostReasonId,
            );
          }
          setPendingLostTransition(null);
        }}
      />
    </CrmViewGate>
  );
}
