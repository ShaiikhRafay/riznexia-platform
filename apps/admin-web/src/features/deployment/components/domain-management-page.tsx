'use client';

import { Button, DataTable, ErrorState, Skeleton } from '@riznexia/ui';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useMemo } from 'react';
import { PermissionGate } from '@/src/components/auth/permission-gate';
import { useLead } from '@/src/features/leads/api/use-lead';
import { useDomains } from '../api/use-domains';
import { buildDomainListColumns } from './domain-list-columns';
import { RegisterDomainDialog } from './register-domain-dialog';

export interface DomainManagementPageProps {
  leadId: string;
}

// Domain Management (F11): `GET /leads/:id/domains` — metadata and
// provider-integration status only, per the backend's own Decision 6; no
// DNS automation is implemented on either side of this page. Registration
// (`POST`) and verification (`POST .../verify`) are both real, permission-
// gated actions — this page is not read-only, since the backend itself
// isn't.
export function DomainManagementPage({ leadId }: DomainManagementPageProps) {
  const { data: lead } = useLead(leadId);
  const { data: domains, isLoading, error, refetch } = useDomains(leadId);
  const columns = useMemo(() => buildDomainListColumns(leadId), [leadId]);

  if (error) {
    return <ErrorState error={error} onRetry={() => void refetch()} />;
  }

  return (
    <div className="flex flex-col gap-6">
      <Button variant="ghost" size="sm" asChild className="self-start">
        <Link href={`/deployment?leadId=${leadId}`}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Deployment Dashboard
        </Link>
      </Button>

      <div className="flex items-center justify-between gap-4">
        <h1 className="text-h1 text-(--color-text-primary) font-semibold">
          Domain Management{lead ? ` — ${lead.businessName}` : ''}
        </h1>
        <PermissionGate permission="deployment:manage">
          <RegisterDomainDialog leadId={leadId} />
        </PermissionGate>
      </div>

      {!lead ? (
        <Skeleton className="h-8 w-64" />
      ) : (
        <DataTable
          columns={columns}
          data={domains ?? []}
          getRowId={(row) => row.id}
          isLoading={isLoading}
          emptyTitle="No domains registered"
          emptyDescription="Register a domain to connect it to a deployment."
        />
      )}
    </div>
  );
}
