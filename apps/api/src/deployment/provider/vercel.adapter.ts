import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UpstreamProviderException } from '../../common/exceptions/app.exception';
import type { DeploymentFile } from './deployment-provider.interface';

const VERCEL_API_BASE = 'https://api.vercel.com';
const REQUEST_TIMEOUT_MS = 30_000;

export type VercelReadyState = 'QUEUED' | 'BUILDING' | 'READY' | 'ERROR' | 'CANCELED';

export interface VercelDeploymentResponse {
  id: string;
  url: string;
  readyState: VercelReadyState;
  errorMessage: string | null;
  // Vercel's top-level `name` on a deployment response is the owning
  // *project*'s name — the same value passed as `name` at creation —
  // needed to resolve which project a domain attaches to when all the
  // caller has is a providerDeploymentId.
  projectName: string;
}

export interface VercelDomainVerification {
  type: string;
  domain: string;
  value: string;
  reason: string;
}

export interface VercelDomainResponse {
  name: string;
  verified: boolean;
  verification: VercelDomainVerification[];
}

interface RawVercelDeployment {
  id: string;
  url: string;
  name: string;
  readyState: VercelReadyState;
  errorMessage?: { message?: string } | null;
}

interface RawVercelDomain {
  name: string;
  verified: boolean;
  verification?: VercelDomainVerification[];
}

interface RawVercelError {
  error?: { message?: string };
}

// The only place in the codebase that calls the Vercel REST API directly
// (mirrors PlacesAdapter's role for Google Places API (New), M5). Not
// wired to any injected fixture — real HTTP calls gated behind
// VERCEL_API_TOKEN; unit tests mock `fetch` itself, never hit the network
// (same convention as places.adapter.spec.ts).
@Injectable()
export class VercelAdapter {
  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.config.get<string>('VERCEL_API_TOKEN'));
  }

  async createDeployment(params: {
    name: string;
    files: DeploymentFile[];
    target: 'production' | 'staging';
  }): Promise<VercelDeploymentResponse> {
    const body = {
      name: params.name,
      target: params.target,
      files: params.files.map((file) => ({ file: file.path, data: file.content })),
    };
    const raw = await this.request<RawVercelDeployment>('POST', '/v13/deployments', body);
    return toDeploymentResponse(raw);
  }

  async getDeployment(deploymentId: string): Promise<VercelDeploymentResponse> {
    const raw = await this.request<RawVercelDeployment>(
      'GET',
      `/v13/deployments/${deploymentId}`,
      undefined,
    );
    return toDeploymentResponse(raw);
  }

  async attachDomain(projectName: string, hostname: string): Promise<VercelDomainResponse> {
    const raw = await this.request<RawVercelDomain>(
      'POST',
      `/v10/projects/${encodeURIComponent(projectName)}/domains`,
      { name: hostname },
    );
    return { name: raw.name, verified: raw.verified, verification: raw.verification ?? [] };
  }

  private async request<T>(method: 'GET' | 'POST', path: string, body: unknown): Promise<T> {
    const apiToken = this.config.get<string>('VERCEL_API_TOKEN');
    if (!apiToken) {
      throw new UpstreamProviderException('Vercel', 'API token not configured');
    }
    const teamId = this.config.get<string>('VERCEL_TEAM_ID');
    const url = teamId
      ? `${VERCEL_API_BASE}${path}?teamId=${encodeURIComponent(teamId)}`
      : `${VERCEL_API_BASE}${path}`;

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiToken}`,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      throw new UpstreamProviderException('Vercel', 'Network error or timeout', {
        cause: error instanceof Error ? error.message : String(error),
      });
    }

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => ({}))) as RawVercelError;
      const message = errorBody.error?.message ?? `HTTP ${response.status}`;
      throw new UpstreamProviderException('Vercel', message, { status: response.status });
    }

    return response.json() as Promise<T>;
  }
}

function toDeploymentResponse(raw: RawVercelDeployment): VercelDeploymentResponse {
  return {
    id: raw.id,
    url: raw.url,
    projectName: raw.name,
    readyState: raw.readyState,
    errorMessage: raw.errorMessage?.message ?? null,
  };
}
