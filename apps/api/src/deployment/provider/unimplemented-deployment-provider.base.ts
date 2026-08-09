import type { DeploymentProviderName } from '@riznexia/shared-types';
import type {
  DeploymentProvider,
  DeploymentProviderInput,
  DeploymentProviderResult,
  DeploymentProviderStatus,
} from './deployment-provider.interface';

// Module M11 (DECISIONS.md D-093) — founder's explicit Decision 2: create
// provider interfaces for Cloudflare Pages/Netlify/AWS Amplify/Azure
// Static Web Apps without building their integrations this phase. Each
// concrete subclass genuinely implements `DeploymentProvider` (so it's a
// one-line `ProviderModule.useClass` swap away from being the active
// provider — no business-logic change required, proving the abstraction
// actually holds) but its methods throw until a real adapter backs it,
// the same "reserved, not built" stance as every other closed-enum
// extension point in this codebase.
export abstract class UnimplementedDeploymentProvider implements DeploymentProvider {
  abstract readonly name: DeploymentProviderName;
  readonly version = 'unimplemented';

  isConfigured(): boolean {
    return false;
  }

  deploy(_input: DeploymentProviderInput): Promise<DeploymentProviderResult> {
    return Promise.reject(this.notImplemented());
  }

  getStatus(_providerDeploymentId: string): Promise<DeploymentProviderStatus> {
    return Promise.reject(this.notImplemented());
  }

  private notImplemented(): Error {
    return new Error(
      `The "${this.name}" deployment provider is reserved for a future module — no adapter is implemented yet.`,
    );
  }
}
