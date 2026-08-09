'use client';

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ErrorState,
  Skeleton,
  StatusBadge,
  toast,
} from '@riznexia/ui';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { PermissionGate } from '@/src/components/auth/permission-gate';
import { useLead } from '@/src/features/leads/api/use-lead';
import { useLeadActivity } from '@/src/features/leads/api/use-lead-activity';
import { ApiError } from '@/src/lib/api-client';
import { useAssignOwner } from '../api/use-assign-owner';
import { useLeadCrm } from '../api/use-lead-crm';
import { useLeadProposals } from '../api/use-lead-proposals';
import { useLeadTasks } from '../api/use-lead-tasks';
import { useSalesStages } from '../api/use-sales-stages';
import { useTransitionStage } from '../api/use-transition-stage';
import { useWebsiteGenerationStatus } from '../api/use-website-generation-status';
import { ActivityList } from './activity-list';
import { CreateTaskDialog } from './create-task-dialog';
import { CrmViewGate } from './crm-view-gate';
import { LostReasonDialog } from './lost-reason-dialog';
import { ProposalList } from './proposal-list';
import { TaskRowActions } from './task-row-actions';

export interface LeadCrmDetailsPageProps {
  leadId: string;
}

// Lead CRM Details (F10): "Display: Lead Information, CRM Status,
// Assigned User, Tasks, Activities, Proposals, Website Status, Timeline.
// Only backend fields." Reuses F4's `useLead()`/`useLeadActivity()`
// directly (cross-feature hook reuse, the same convention F6-F9
// established). Stage/owner changes reuse the real endpoints the Pipeline
// Board and Permissions sections already name (`crm:manage`/`crm:assign`)
// — a natural place to manage a single lead's CRM state, not a new
// capability invented for this page. "Timeline" = the same
// `useLeadActivity()` feed, unfiltered (all 14 types) — "Activities" =
// the same feed, filtered to the 4 loggable types the brief names
// (DECISIONS.md D-180).
export function LeadCrmDetailsPage({ leadId }: LeadCrmDetailsPageProps) {
  const {
    data: lead,
    isLoading: leadLoading,
    error: leadError,
    refetch: refetchLead,
  } = useLead(leadId);

  if (leadLoading) {
    return (
      <CrmViewGate>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-4 h-96 w-full" />
      </CrmViewGate>
    );
  }
  if (leadError) {
    return (
      <CrmViewGate>
        <ErrorState error={leadError} onRetry={() => void refetchLead()} />
      </CrmViewGate>
    );
  }
  if (!lead) {
    return null;
  }

  return (
    <CrmViewGate>
      <LeadCrmDetailsContent
        leadId={leadId}
        businessName={lead.businessName}
        category={lead.category}
        city={lead.city}
      />
    </CrmViewGate>
  );
}

function LeadCrmDetailsContent({
  leadId,
  businessName,
  category,
  city,
}: {
  leadId: string;
  businessName: string;
  category: string;
  city: string;
}) {
  const {
    data: crm,
    isLoading: crmLoading,
    error: crmError,
    refetch: refetchCrm,
  } = useLeadCrm(leadId);
  const { data: stages } = useSalesStages();
  const transitionStage = useTransitionStage(leadId);
  const assignOwner = useAssignOwner(leadId);
  const [pendingLostStageId, setPendingLostStageId] = useState<string | null>(null);
  const [ownerDraft, setOwnerDraft] = useState('');

  const tasks = useLeadTasks(leadId);
  const activity = useLeadActivity(leadId);
  const proposals = useLeadProposals(leadId);
  const websiteStatus = useWebsiteGenerationStatus(leadId);

  const allActivities = activity.data?.pages.flatMap((page) => page.items) ?? [];
  const categoryActivities = allActivities.filter((item) =>
    ['call', 'email', 'meeting', 'whatsapp'].includes(item.type),
  );

  async function handleStageChange(stageId: string) {
    const targetStage = stages?.find((stage) => stage.id === stageId);
    if (targetStage?.isLost) {
      setPendingLostStageId(stageId);
      return;
    }
    try {
      await transitionStage.mutateAsync({ stageId });
      toast.success('Stage updated');
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Could not update the stage.';
      toast.error(message);
    }
  }

  async function handleAssignOwner() {
    try {
      await assignOwner.mutateAsync({ ownerId: ownerDraft || null });
      toast.success(ownerDraft ? 'Owner assigned' : 'Owner unassigned');
      setOwnerDraft('');
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Could not update the owner.';
      toast.error(message);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Button variant="ghost" size="sm" asChild className="self-start">
        <Link href="/crm/pipeline">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Pipeline Board
        </Link>
      </Button>
      <h1 className="text-h1 text-(--color-text-primary) font-semibold">{businessName}</h1>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Lead Information</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-(--color-text-secondary) text-sm">Category: {category}</p>
            <p className="text-(--color-text-secondary) text-sm">City: {city}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>CRM Status</CardTitle>
          </CardHeader>
          <CardContent>
            {crmLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : crmError ? (
              <ErrorState error={crmError} onRetry={() => void refetchCrm()} />
            ) : crm ? (
              <>
                <PermissionGate
                  permission="crm:manage"
                  fallback={
                    <StatusBadge
                      variant="info"
                      label={stages?.find((s) => s.id === crm.stageId)?.name ?? crm.stageId}
                    />
                  }
                >
                  <select
                    value={crm.stageId}
                    onChange={(event) => void handleStageChange(event.target.value)}
                    className="border-(--color-border-default) bg-(--color-bg-canvas) text-(--color-text-primary) focus-visible:ring-(--color-accent) h-9 w-full rounded-md border px-3 text-sm focus-visible:outline-none focus-visible:ring-2"
                  >
                    {(stages ?? []).map((stage) => (
                      <option key={stage.id} value={stage.id}>
                        {stage.name}
                      </option>
                    ))}
                  </select>
                </PermissionGate>
                <p className="text-(--color-text-secondary) text-sm">
                  Deal Value:{' '}
                  {crm.dealValueUsd !== null ? `$${crm.dealValueUsd.toLocaleString()}` : '—'}
                </p>
                <p className="text-(--color-text-secondary) text-sm">
                  Next Follow-Up:{' '}
                  {crm.nextFollowUpAt ? new Date(crm.nextFollowUpAt).toLocaleString() : '—'}
                </p>
              </>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assigned User</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-(--color-text-secondary) text-sm">{crm?.ownerId ?? 'Unassigned'}</p>
            <PermissionGate permission="crm:assign">
              <div className="flex gap-2">
                <input
                  value={ownerDraft}
                  onChange={(event) => setOwnerDraft(event.target.value)}
                  placeholder="User ID (blank to unassign)"
                  className="border-(--color-border-default) bg-(--color-bg-canvas) text-(--color-text-primary) focus-visible:ring-(--color-accent) h-9 flex-1 rounded-md border px-3 text-sm focus-visible:outline-none focus-visible:ring-2"
                />
                <Button
                  size="sm"
                  onClick={() => void handleAssignOwner()}
                  loading={assignOwner.isPending}
                >
                  Assign
                </Button>
              </div>
            </PermissionGate>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Website Status</CardTitle>
          </CardHeader>
          <CardContent>
            {websiteStatus.isLoading ? (
              <Skeleton className="h-16 w-full" />
            ) : websiteStatus.error ? (
              <ErrorState
                error={websiteStatus.error}
                onRetry={() => void websiteStatus.refetch()}
              />
            ) : websiteStatus.data ? (
              <>
                <StatusBadge variant="info" label={websiteStatus.data.stage.replace(/_/g, ' ')} />
                <p className="text-(--color-text-secondary) text-sm">
                  Publish Readiness: {websiteStatus.data.publishReadinessScore ?? '—'}
                </p>
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Tasks</CardTitle>
            <PermissionGate permission="crm:manage">
              <CreateTaskDialog leadId={leadId} />
            </PermissionGate>
          </div>
        </CardHeader>
        <CardContent>
          {tasks.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : tasks.error ? (
            <ErrorState error={tasks.error} onRetry={() => void tasks.refetch()} />
          ) : (
            <ul className="flex flex-col gap-2">
              {(tasks.data?.items ?? []).map((task) => (
                <li key={task.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-(--color-text-primary)">{task.title}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-(--color-text-secondary)">
                      {new Date(task.dueDate).toLocaleDateString()}
                    </span>
                    <TaskRowActions task={task} leadId={leadId} />
                  </div>
                </li>
              ))}
              {(tasks.data?.items.length ?? 0) === 0 ? (
                <li className="text-(--color-text-secondary)">No tasks yet.</li>
              ) : null}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activities</CardTitle>
        </CardHeader>
        <CardContent>
          {activity.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <ActivityList activities={categoryActivities} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Proposals</CardTitle>
        </CardHeader>
        <CardContent>
          {proposals.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : proposals.error ? (
            <ErrorState error={proposals.error} onRetry={() => void proposals.refetch()} />
          ) : (
            <ProposalList proposals={proposals.data?.items ?? []} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {activity.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : activity.error ? (
            <ErrorState error={activity.error} onRetry={() => void activity.refetch()} />
          ) : (
            <ActivityList activities={allActivities} />
          )}
        </CardContent>
      </Card>

      <LostReasonDialog
        open={!!pendingLostStageId}
        onCancel={() => setPendingLostStageId(null)}
        onConfirm={async (lostReasonId) => {
          const stageId = pendingLostStageId;
          setPendingLostStageId(null);
          if (!stageId) {
            return;
          }
          try {
            await transitionStage.mutateAsync({ stageId, lostReasonId });
            toast.success('Stage updated');
          } catch (error) {
            const message =
              error instanceof ApiError ? error.message : 'Could not update the stage.';
            toast.error(message);
          }
        }}
      />
    </div>
  );
}
