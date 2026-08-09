import { Injectable } from '@nestjs/common';
import { VercelAdapter, type VercelReadyState } from './vercel.adapter';
import type {
  DeploymentDomainAttachment,
  DeploymentProvider,
  DeploymentProviderInput,
  DeploymentProviderResult,
  DeploymentProviderRunState,
  DeploymentProviderStatus,
} from './deployment-provider.interface';

export const VERCEL_PROVIDER_VERSION = 'v1.0';

const READY_STATE_MAP: Record<VercelReadyState, DeploymentProviderRunState> = {
  QUEUED: 'building',
  BUILDING: 'building',
  READY: 'ready',
  ERROR: 'error',
  CANCELED: 'error',
};

// Module M11 (DECISIONS.md D-093) — the only concrete DeploymentProvider
// implementation this phase. Wraps VercelAdapter (the sole caller of the
// Vercel REST API) and translates between Vercel's shapes and the
// provider-agnostic DeploymentProviderResult/Status shapes. Business
// logic (DeploymentEngineService, DomainEngineService) never imports this
// class directly — it's registered behind the DEPLOYMENT_PROVIDER token.
@Injectable()
export class VercelProvider implements DeploymentProvider {
  readonly name = 'vercel' as const;
  readonly version = VERCEL_PROVIDER_VERSION;

  constructor(private readonly vercelAdapter: VercelAdapter) {}

  isConfigured(): boolean {
    return this.vercelAdapter.isConfigured();
  }

  async deploy(input: DeploymentProviderInput): Promise<DeploymentProviderResult> {
    const target = input.environment === 'production' ? 'production' : 'staging';
    const result = await this.vercelAdapter.createDeployment({
      name: input.projectName,
      files: input.files,
      target,
    });
    return {
      providerDeploymentId: result.id,
      liveUrl: toLiveUrl(result.url),
    };
  }

  async getStatus(providerDeploymentId: string): Promise<DeploymentProviderStatus> {
    const result = await this.vercelAdapter.getDeployment(providerDeploymentId);
    return {
      status: READY_STATE_MAP[result.readyState],
      liveUrl: result.readyState === 'READY' ? toLiveUrl(result.url) : null,
      errorMessage: result.errorMessage,
    };
  }

  async attachDomain(
    providerDeploymentId: string,
    hostname: string,
  ): Promise<DeploymentDomainAttachment> {
    // Vercel attaches domains to a *project*, not a deployment — resolve
    // the owning project name from the deployment first (the same
    // `projectName` originally passed to deploy()).
    const deployment = await this.vercelAdapter.getDeployment(providerDeploymentId);
    const result = await this.vercelAdapter.attachDomain(deployment.projectName, hostname);
    return {
      verified: result.verified,
      verificationRecord: result.verified ? null : { verification: result.verification },
    };
  }
}

function toLiveUrl(vercelUrl: string): string {
  return vercelUrl.startsWith('http') ? vercelUrl : `https://${vercelUrl}`;
}
