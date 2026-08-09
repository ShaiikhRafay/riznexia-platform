import { z } from 'zod';

// Module M11 (DECISIONS.md D-093) — the Deployment Provider abstraction's
// closed set of pluggable targets. Only `vercel` has a concrete provider
// implementation this phase; the rest are reserved values with no
// business logic behind them yet — a future provider is a deliberate,
// additive schema change, same closed-enum discipline as every other
// taxonomy in this package.
export const DEPLOYMENT_PROVIDER_NAMES = [
  'vercel',
  'cloudflare_pages',
  'netlify',
  'aws_amplify',
  'azure_static_web_apps',
  'self_hosted',
] as const;
export type DeploymentProviderName = (typeof DEPLOYMENT_PROVIDER_NAMES)[number];

export const deploymentProviderNameSchema = z.enum(DEPLOYMENT_PROVIDER_NAMES);

// Only `production` is creatable via the API this phase — `preview` is
// reserved for the founder's Future Compatibility "Preview Deployments"
// item.
export const DEPLOYMENT_ENVIRONMENTS = ['production', 'preview'] as const;
export type DeploymentEnvironment = (typeof DEPLOYMENT_ENVIRONMENTS)[number];
