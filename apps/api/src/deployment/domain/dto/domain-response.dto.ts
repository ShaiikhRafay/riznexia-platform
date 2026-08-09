import type { Domain as DomainModel } from '@riznexia/db';
import type { Domain } from '@riznexia/shared-types';
import { toApiProviderName } from '../../deployment.mapper';

const DOMAIN_TYPE_TO_API = { CUSTOM: 'custom', SUBDOMAIN: 'subdomain' } as const;
const VERIFICATION_STATUS_TO_API = {
  PENDING: 'pending',
  VERIFIED: 'verified',
  FAILED: 'failed',
} as const;
const SSL_STATUS_TO_API = {
  PENDING: 'pending',
  ACTIVE: 'active',
  FAILED: 'failed',
  EXPIRED: 'expired',
} as const;

export function toDomainResponse(domain: DomainModel): Domain {
  return {
    id: domain.id,
    businessId: domain.businessId,
    hostname: domain.hostname,
    type: DOMAIN_TYPE_TO_API[domain.type],
    provider: toApiProviderName(domain.provider),
    verificationStatus: VERIFICATION_STATUS_TO_API[domain.verificationStatus],
    verificationRecord: domain.verificationRecord as Record<string, unknown> | null,
    sslStatus: SSL_STATUS_TO_API[domain.sslStatus],
    currentDeploymentId: domain.currentDeploymentId,
    createdAt: domain.createdAt.toISOString(),
    updatedAt: domain.updatedAt.toISOString(),
  };
}
