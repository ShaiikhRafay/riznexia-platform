import type { DeploymentProviderName } from '@riznexia/shared-types';

// Module M11 (DECISIONS.md D-093) — the provider-agnostic contract every
// deployment target implements, the exact structural mirror of
// LocationProvider (M5, D-033). Business logic (DeploymentEngineService,
// DomainEngineService) depends only on this interface, injected behind
// the DEPLOYMENT_PROVIDER token — never on a concrete class like
// VercelProvider. A future CloudflarePagesProvider/NetlifyProvider/
// AwsAmplifyProvider/AzureStaticWebAppsProvider/SelfHostedProvider
// implements the same shape; swapping the active one means changing
// ProviderModule's `useClass` line, nothing else.
//
// No `rollback()` method: a rollback is always a fresh `deploy()` call
// against a historical GeneratedWebsite snapshot (founder's explicit
// Decision 3), which is what makes rollback portable across every future
// provider without each one needing a native rollback API.

export const DEPLOYMENT_PROVIDER = Symbol('DEPLOYMENT_PROVIDER');

export interface DeploymentFile {
  path: string;
  content: string;
}

export interface DeploymentProviderInput {
  files: DeploymentFile[];
  projectName: string;
  environment: 'production' | 'preview';
}

export interface DeploymentProviderResult {
  providerDeploymentId: string;
  liveUrl: string;
}

export type DeploymentProviderRunState = 'building' | 'ready' | 'error';

export interface DeploymentProviderStatus {
  status: DeploymentProviderRunState;
  liveUrl: string | null;
  errorMessage: string | null;
}

// Domain/SSL provider-integration surface (founder's Decision 6: metadata
// and provider integration only, never DNS automation or SSL issuance).
// Optional — a provider that doesn't support programmatic domain
// attachment simply omits these, and DomainEngineService treats that as
// "verification/SSL stay PENDING until handled manually."
export interface DeploymentDomainAttachment {
  verified: boolean;
  verificationRecord: Record<string, unknown> | null;
}

export interface DeploymentProvider {
  readonly name: DeploymentProviderName;
  readonly version: string;
  /** Synchronous, no network call — just "do I have credentials configured". */
  isConfigured(): boolean;
  deploy(input: DeploymentProviderInput): Promise<DeploymentProviderResult>;
  getStatus(providerDeploymentId: string): Promise<DeploymentProviderStatus>;
  attachDomain?(
    providerDeploymentId: string,
    hostname: string,
  ): Promise<DeploymentDomainAttachment>;
}
