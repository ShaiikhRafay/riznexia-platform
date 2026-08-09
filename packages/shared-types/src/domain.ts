import { z } from 'zod';
import { deploymentProviderNameSchema } from './deployment-provider';

// Module M11 (DECISIONS.md D-096) — Domain Engine. Unlike
// WebsiteDeployment, this is a mutable, long-lived pointer (a hostname
// persists across many deployments going live under it), not immutable
// history — closer in kind to LeadCRM (D-083) than SalesProposal's
// immutable-version rows (D-085).
export const DOMAIN_TYPES = ['custom', 'subdomain'] as const;
export type DomainType = (typeof DOMAIN_TYPES)[number];

export const DOMAIN_VERIFICATION_STATUSES = ['pending', 'verified', 'failed'] as const;
export type DomainVerificationStatus = (typeof DOMAIN_VERIFICATION_STATUSES)[number];

export const SSL_STATUSES = ['pending', 'active', 'failed', 'expired'] as const;
export type SslStatus = (typeof SSL_STATUSES)[number];

const HOSTNAME_REGEX = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

export const hostnameSchema = z.string().trim().toLowerCase().regex(HOSTNAME_REGEX, {
  message: 'Must be a valid hostname (e.g. example.com or shop.example.com)',
});

// Metadata and provider-integration status only (founder's explicit
// Decision 6) — no DNS automation, no SSL issuance, no registrar API
// calls happen anywhere in this module.
export const domainSchema = z.object({
  id: z.string().uuid(),
  businessId: z.string().uuid(),
  hostname: z.string().min(1),
  type: z.enum(DOMAIN_TYPES),
  provider: deploymentProviderNameSchema,
  verificationStatus: z.enum(DOMAIN_VERIFICATION_STATUSES),
  verificationRecord: z.record(z.unknown()).nullable(),
  sslStatus: z.enum(SSL_STATUSES),
  currentDeploymentId: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Domain = z.infer<typeof domainSchema>;

// `provider` is deliberately not a client input here, same reasoning as
// createWebsiteDeploymentSchema omitting a provider selector — the
// business layer never depends on a specific provider (founder's
// Decision 2), so the service sets it from whichever DEPLOYMENT_PROVIDER
// is actually wired up, not from a client-chosen value.
export const createDomainSchema = z.object({
  hostname: hostnameSchema,
  type: z.enum(DOMAIN_TYPES),
});
export type CreateDomainInput = z.infer<typeof createDomainSchema>;
