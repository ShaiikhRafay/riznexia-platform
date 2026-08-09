'use client';

import type { Domain } from '@riznexia/shared-types';
import { Button, toast } from '@riznexia/ui';
import { PermissionGate } from '@/src/components/auth/permission-gate';
import { ApiError } from '@/src/lib/api-client';
import { useVerifyDomain } from '../api/use-verify-domain';

export interface DomainRowActionsProps {
  leadId: string;
  domain: Domain;
}

export function DomainRowActions({ leadId, domain }: DomainRowActionsProps) {
  const verifyDomain = useVerifyDomain(leadId, domain.id);

  function handleVerify() {
    verifyDomain
      .mutateAsync()
      .then(() => toast.success('Verification requested'))
      .catch((error: unknown) => {
        const message = error instanceof ApiError ? error.message : 'Could not verify this domain.';
        toast.error(message);
      });
  }

  return (
    <PermissionGate permission="deployment:manage">
      <Button
        size="sm"
        variant="secondary"
        onClick={handleVerify}
        loading={verifyDomain.isPending}
        disabled={domain.verificationStatus === 'verified'}
      >
        {domain.verificationStatus === 'verified' ? 'Verified' : 'Verify'}
      </Button>
    </PermissionGate>
  );
}
