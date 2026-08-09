import type {
  DeploymentProviderName,
  DeploymentStatus,
  DomainVerificationStatus,
  HealthStatus,
  SslStatus,
} from '@riznexia/shared-types';
import type { StatusBadgeProps } from '@riznexia/ui';

// The feature-local half of StatusBadge's generic/specific split (same
// pattern as CRM's status.ts, Discovery's status.ts). Every enum here is
// verified directly against its own `_STATUSES`/`_NAMES` const array in
// `packages/shared-types` — no frontend-invented state.
export const DEPLOYMENT_STATUS_PRESENTATION: Record<
  DeploymentStatus,
  { variant: StatusBadgeProps['variant']; label: string }
> = {
  requested: { variant: 'neutral', label: 'Requested' },
  validating: { variant: 'info', label: 'Validating' },
  in_progress: { variant: 'info', label: 'In Progress' },
  completed: { variant: 'success', label: 'Completed' },
  failed: { variant: 'danger', label: 'Failed' },
};

export const HEALTH_STATUS_PRESENTATION: Record<
  HealthStatus,
  { variant: StatusBadgeProps['variant']; label: string }
> = {
  unknown: { variant: 'neutral', label: 'Unknown' },
  healthy: { variant: 'success', label: 'Healthy' },
  unhealthy: { variant: 'danger', label: 'Unhealthy' },
};

export const DOMAIN_VERIFICATION_STATUS_PRESENTATION: Record<
  DomainVerificationStatus,
  { variant: StatusBadgeProps['variant']; label: string }
> = {
  pending: { variant: 'neutral', label: 'Pending' },
  verified: { variant: 'success', label: 'Verified' },
  failed: { variant: 'danger', label: 'Failed' },
};

export const SSL_STATUS_PRESENTATION: Record<
  SslStatus,
  { variant: StatusBadgeProps['variant']; label: string }
> = {
  pending: { variant: 'neutral', label: 'Pending' },
  active: { variant: 'success', label: 'Active' },
  failed: { variant: 'danger', label: 'Failed' },
  expired: { variant: 'warning', label: 'Expired' },
};

// `DEPLOYMENT_PROVIDER_NAMES` are already lowercase snake_case backend
// values (e.g. `cloudflare_pages`) — this only supplies a human-readable
// label, never a different value.
export const DEPLOYMENT_PROVIDER_LABELS: Record<DeploymentProviderName, string> = {
  vercel: 'Vercel',
  cloudflare_pages: 'Cloudflare Pages',
  netlify: 'Netlify',
  aws_amplify: 'AWS Amplify',
  azure_static_web_apps: 'Azure Static Web Apps',
  self_hosted: 'Self-Hosted',
};
