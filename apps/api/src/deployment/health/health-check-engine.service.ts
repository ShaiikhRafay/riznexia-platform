import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Prisma, PrismaClient } from '@riznexia/db';
import type {
  DeploymentHealthCheck,
  ListDeploymentHealthChecksQuery,
} from '@riznexia/shared-types';
import { LeadsService } from '../../leads/leads.service';
import { PRISMA_CLIENT } from '../../common/database/database.constants';
import {
  LeadNotFoundException,
  WebsiteDeploymentNotFoundException,
} from '../../common/exceptions/app.exception';
import { toPrismaHealthStatus } from '../deployment.mapper';
import { toDeploymentHealthCheckResponse } from './dto/deployment-health-check-response.dto';

export interface PaginatedDeploymentHealthChecks {
  items: DeploymentHealthCheck[];
  nextCursor: string | null;
}

interface CheckResult {
  name: string;
  passed: boolean;
  detail?: Record<string, unknown>;
}

const REQUEST_TIMEOUT_MS = 10_000;

// Module M11 (DECISIONS.md D-095) — Health Check Engine. Founder's
// explicit Decision 5: independent of deployment providers — the
// reachability check is a plain HTTP request against the deployment's own
// `liveUrl`, never a call through DeploymentProvider or any provider SDK.
// Deterministic: given the same HTTP response, the same
// WebsiteDeployment.status, and the same Domain row, this always produces
// the same verdict — the only non-deterministic part is the network call
// itself, exactly the same stance packages/website-preview's validators
// take toward "no Lighthouse, deterministic proxies" (D-081).
//
// `runCheck()` never throws — a health-check failure (e.g. a network blip
// hitting the fresh URL) must never be able to flip an already-COMPLETED
// deployment to FAILED; it can only ever produce an UNHEALTHY result.
@Injectable()
export class HealthCheckEngineService {
  private readonly logger = new Logger(HealthCheckEngineService.name);

  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    private readonly leadsService: LeadsService,
  ) {}

  async runCheck(deploymentId: string, liveUrl: string): Promise<void> {
    const deployment = await this.prisma.websiteDeployment.findUnique({
      where: { id: deploymentId },
    });
    if (!deployment) {
      this.logger.warn(
        `Health Check skipped: no WebsiteDeployment found for deploymentId=${deploymentId}`,
      );
      return;
    }

    const checks: CheckResult[] = [];
    checks.push({
      name: 'deployment_status',
      passed: deployment.status === 'COMPLETED',
      detail: { status: deployment.status },
    });

    const {
      passed: reachable,
      responseTimeMs,
      httpStatusCode,
    } = await this.checkReachability(liveUrl);
    checks.push({ name: 'website_reachable', passed: reachable, detail: { httpStatusCode } });

    const domain = await this.prisma.domain.findFirst({
      where: { currentDeploymentId: deploymentId },
    });
    checks.push({
      name: 'domain_status',
      passed: !domain || domain.verificationStatus === 'VERIFIED',
      detail: domain
        ? { hostname: domain.hostname, verificationStatus: domain.verificationStatus }
        : { skipped: true },
    });
    checks.push({
      name: 'ssl_status',
      passed: !domain || domain.sslStatus === 'ACTIVE',
      detail: domain
        ? { hostname: domain.hostname, sslStatus: domain.sslStatus }
        : { skipped: true },
    });

    const allPassed = checks.every((check) => check.passed);
    const status = toPrismaHealthStatus(allPassed ? 'healthy' : 'unhealthy');

    await this.prisma.$transaction([
      this.prisma.deploymentHealthCheck.create({
        data: {
          deploymentId,
          status,
          checkedAt: new Date(),
          responseTimeMs,
          httpStatusCode,
          detail: { checks } as unknown as Prisma.InputJsonValue,
        },
      }),
      this.prisma.websiteDeployment.update({
        where: { id: deploymentId },
        data: { healthStatus: status },
      }),
    ]);

    this.logger.log(`Health Check Completed: deploymentId=${deploymentId}, status=${status}`);
  }

  async listForDeployment(
    leadId: string,
    deploymentId: string,
    query: ListDeploymentHealthChecksQuery,
  ): Promise<PaginatedDeploymentHealthChecks> {
    const businessId = await this.resolveBusinessId(leadId);
    await this.assertDeploymentBelongsToBusiness(businessId, deploymentId);

    const rows = await this.prisma.deploymentHealthCheck.findMany({
      where: { deploymentId },
      take: query.limit + 1,
      ...(query.cursor && { cursor: { id: query.cursor }, skip: 1 }),
      orderBy: { checkedAt: 'desc' },
    });

    const hasMore = rows.length > query.limit;
    const page = hasMore ? rows.slice(0, query.limit) : rows;
    const last = page.at(-1);

    return {
      items: page.map(toDeploymentHealthCheckResponse),
      nextCursor: hasMore && last ? last.id : null,
    };
  }

  async triggerManualCheck(leadId: string, deploymentId: string): Promise<DeploymentHealthCheck> {
    const businessId = await this.resolveBusinessId(leadId);
    const deployment = await this.assertDeploymentBelongsToBusiness(businessId, deploymentId);

    await this.runCheck(deploymentId, deployment.liveUrl ?? '');

    const latest = await this.prisma.deploymentHealthCheck.findFirstOrThrow({
      where: { deploymentId },
      orderBy: { checkedAt: 'desc' },
    });
    return toDeploymentHealthCheckResponse(latest);
  }

  private async checkReachability(
    liveUrl: string,
  ): Promise<{ passed: boolean; responseTimeMs: number | null; httpStatusCode: number | null }> {
    if (!liveUrl) {
      return { passed: false, responseTimeMs: null, httpStatusCode: null };
    }
    const startedAt = Date.now();
    try {
      const response = await fetch(liveUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      return {
        passed: response.ok,
        responseTimeMs: Date.now() - startedAt,
        httpStatusCode: response.status,
      };
    } catch {
      return { passed: false, responseTimeMs: Date.now() - startedAt, httpStatusCode: null };
    }
  }

  private async assertDeploymentBelongsToBusiness(businessId: string, deploymentId: string) {
    const deployment = await this.prisma.websiteDeployment.findUnique({
      where: { id: deploymentId },
    });
    if (!deployment || deployment.businessId !== businessId) {
      throw new WebsiteDeploymentNotFoundException();
    }
    return deployment;
  }

  private async resolveBusinessId(leadId: string): Promise<string> {
    const lead = await this.leadsService.findById(leadId);
    if (!lead) {
      throw new LeadNotFoundException();
    }
    return lead.businessId;
  }
}
