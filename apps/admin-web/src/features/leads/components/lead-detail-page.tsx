'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  ErrorState,
  Skeleton,
  toast,
} from '@riznexia/ui';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PermissionGate } from '@/src/components/auth/permission-gate';
import { ApiError } from '@/src/lib/api-client';
import { useDeleteLead } from '../api/use-delete-lead';
import { useLead } from '../api/use-lead';
import { BusinessInformationSection } from './lead-detail/business-information-section';
import { LeadActivityTimeline } from './lead-detail/lead-activity-timeline';
import { LeadNotesPanel } from './lead-detail/lead-notes-panel';
import { LeadStatusSection } from './lead-detail/lead-status-section';
import { NotAvailableSection } from './lead-detail/not-available-section';

export interface LeadDetailPageProps {
  leadId: string;
}

// Lead Details (F4): displays every field `GET /leads/:id` actually
// returns (Business Information, Status, Tags, Assigned User), plus
// Contact Information and Google Places Information — required by scope
// but not present in the API response, so they render an honest "not
// available" placeholder rather than invented data (founder-approved
// resolution; see docs/frontend/f4-review.md and DECISIONS.md).
export function LeadDetailPage({ leadId }: LeadDetailPageProps) {
  const router = useRouter();
  const { data: lead, isLoading, error, refetch } = useLead(leadId);
  const deleteLead = useDeleteLead();

  async function handleDelete() {
    if (!lead) {
      return;
    }
    try {
      await deleteLead.mutateAsync(lead.id);
      toast.success(`${lead.businessName} deleted`);
      router.push('/leads');
    } catch (deleteError) {
      const message =
        deleteError instanceof ApiError ? deleteError.message : 'Could not delete this lead.';
      toast.error(message);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" asChild className="self-start">
          <Link href="/leads">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to Leads
          </Link>
        </Button>
        {lead ? (
          <div className="flex items-center gap-2">
            <PermissionGate permission="leads:write">
              <Button variant="secondary" size="sm" asChild>
                <Link href={`/leads/${lead.id}/edit`}>
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                  Edit
                </Link>
              </Button>
            </PermissionGate>
            <PermissionGate permission="leads:delete">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete {lead.businessName}?</AlertDialogTitle>
                    <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction variant="destructive" onClick={() => void handleDelete()}>
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </PermissionGate>
          </div>
        ) : null}
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : lead ? (
        <>
          <h1 className="text-h1 text-(--color-text-primary) font-semibold">{lead.businessName}</h1>
          <div className="grid gap-4 md:grid-cols-2">
            <BusinessInformationSection lead={lead} />
            <LeadStatusSection lead={lead} />
            <NotAvailableSection title="Contact Information" />
            <NotAvailableSection title="Google Places Information" />
          </div>
          <LeadNotesPanel leadId={lead.id} />
          <LeadActivityTimeline leadId={lead.id} />
        </>
      ) : null}
    </div>
  );
}
