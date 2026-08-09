'use client';

import { Button, ErrorState, Skeleton } from '@riznexia/ui';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useLead } from '../api/use-lead';
import { EditLeadForm } from './edit-lead-form';

export interface EditLeadPageProps {
  leadId: string;
}

export function EditLeadPage({ leadId }: EditLeadPageProps) {
  const { data: lead, isLoading, error, refetch } = useLead(leadId);

  return (
    <div className="flex flex-col gap-6">
      <Button variant="ghost" size="sm" asChild className="self-start">
        <Link href={`/leads/${leadId}`}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Lead
        </Link>
      </Button>

      {isLoading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={() => void refetch()} />
      ) : lead ? (
        <>
          <h1 className="text-h1 text-(--color-text-primary) font-semibold">
            Edit {lead.businessName}
          </h1>
          <EditLeadForm lead={lead} />
        </>
      ) : null}
    </div>
  );
}
