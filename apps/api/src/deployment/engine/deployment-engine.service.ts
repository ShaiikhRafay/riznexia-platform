import { Inject, Injectable, Logger } from '@nestjs/common';
import type { GeneratedWebsite, PrismaClient } from '@riznexia/db';
import type {
  CreateWebsiteDeploymentInput,
  GeneratedWebsiteFile,
  ListWebsiteDeploymentsQuery,
  WebsiteDeployment,
} from '@riznexia/shared-types';
import { LeadsService } from '../../leads/leads.service';
import { PRISMA_CLIENT } from '../../common/database/database.constants';
import {
  DeploymentNotRetryableException,
  DeploymentProviderUnavailableException,
  DeploymentValidationFailedException,
  GeneratedWebsiteNotFoundException,
  LeadNotFoundException,
  WebsiteDeploymentNotFoundException,
} from '../../common/exceptions/app.exception';
import { WebsitePreviewService } from '../../website-preview/website-preview.service';
import {
  DEPLOYMENT_PROVIDER,
  type DeploymentProvider,
} from '../provider/deployment-provider.interface';
import { HealthCheckEngineService } from '../health/health-check-engine.service';
import { toWebsiteDeploymentResponse } from './dto/website-deployment-response.dto';
import { toPrismaProviderName } from '../deployment.mapper';
import { DEPLOYMENT_ENGINE_VERSION } from './deployment-engine.constants';
import { computeDeploymentHash } from './deployment-hash';
import { toProjectName } from './project-name';

export interface PaginatedWebsiteDeployments {
  items: WebsiteDeployment[];
  nextCursor: string | null;
}

interface DeployParams {
  leadId: string;
  businessId: string;
  generatedWebsite: GeneratedWebsite;
  actorId: string | null;
  commitHash?: string | null;
  retryOfDeploymentId?: string;
  rollbackFromDeploymentId?: string;
}

// Module M11 (DECISIONS.md D-094) — the Deployment Engine's core
// orchestration service: Build Validation → Deployment Started →
// Deployment Completed/Failed, exactly the founder's lifecycle. Never
// generates or modifies a website (founder's explicit Constraints) — it
// only ever reads an already-assembled `GeneratedWebsite` and an
// already-computed `PreviewReport` (via WebsitePreviewService, never
// re-running validators itself). A provider-call failure is caught and
// recorded as a FAILED row, not re-thrown as an HTTP error — "Deployment
// Failed" is a normal lifecycle outcome the API returns 201 for, not an
// exceptional one (founder's own "Retry Available" branch implies this).
@Injectable()
export class DeploymentEngineService {
  private readonly logger = new Logger(DeploymentEngineService.name);

  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(DEPLOYMENT_PROVIDER) private readonly deploymentProvider: DeploymentProvider,
    private readonly leadsService: LeadsService,
    private readonly websitePreviewService: WebsitePreviewService,
    private readonly healthCheckEngineService: HealthCheckEngineService,
  ) {}

  async listForLead(
    leadId: string,
    query: ListWebsiteDeploymentsQuery,
  ): Promise<PaginatedWebsiteDeployments> {
    const businessId = await this.resolveBusinessId(leadId);

    const rows = await this.prisma.websiteDeployment.findMany({
      where: { businessId },
      take: query.limit + 1,
      ...(query.cursor && { cursor: { id: query.cursor }, skip: 1 }),
      orderBy: { deploymentVersion: 'desc' },
    });

    const hasMore = rows.length > query.limit;
    const page = hasMore ? rows.slice(0, query.limit) : rows;
    const last = page.at(-1);

    return {
      items: page.map(toWebsiteDeploymentResponse),
      nextCursor: hasMore && last ? last.id : null,
    };
  }

  async findByIdOrThrow(leadId: string, deploymentId: string): Promise<WebsiteDeployment> {
    const businessId = await this.resolveBusinessId(leadId);
    const deployment = await this.findRowOrThrow(businessId, deploymentId);
    return toWebsiteDeploymentResponse(deployment);
  }

  async requestDeployment(
    leadId: string,
    input: CreateWebsiteDeploymentInput,
    actorId: string | null,
  ): Promise<WebsiteDeployment> {
    const businessId = await this.resolveBusinessId(leadId);
    const generatedWebsite = await this.latestGeneratedWebsite(businessId);
    return this.deployGeneratedWebsite({
      leadId,
      businessId,
      generatedWebsite,
      actorId,
      commitHash: input.commitHash,
    });
  }

  async retryDeployment(
    leadId: string,
    deploymentId: string,
    actorId: string | null,
  ): Promise<WebsiteDeployment> {
    const businessId = await this.resolveBusinessId(leadId);
    const failed = await this.findRowOrThrow(businessId, deploymentId);
    if (failed.status !== 'FAILED') {
      throw new DeploymentNotRetryableException();
    }

    const generatedWebsite = await this.prisma.generatedWebsite.findUniqueOrThrow({
      where: { id: failed.generatedWebsiteId },
    });
    return this.deployGeneratedWebsite({
      leadId,
      businessId,
      generatedWebsite,
      actorId,
      commitHash: failed.commitHash,
      retryOfDeploymentId: deploymentId,
    });
  }

  /**
   * The one real entry point every deploy — fresh, retry, or rollback —
   * funnels through. Rollback Engine calls this directly with
   * `rollbackFromDeploymentId` set and a historical `generatedWebsite`
   * snapshot; it never duplicates this orchestration itself.
   */
  async deployGeneratedWebsite(params: DeployParams): Promise<WebsiteDeployment> {
    if (!this.deploymentProvider.isConfigured()) {
      throw new DeploymentProviderUnavailableException();
    }

    await this.assertPublishReady(params.leadId);

    const business = await this.prisma.business.findUniqueOrThrow({
      where: { id: params.businessId },
      select: { businessName: true },
    });

    const deploymentVersion = await this.nextDeploymentVersion(params.businessId);
    const files = params.generatedWebsite.files as unknown as GeneratedWebsiteFile[];
    const deploymentHash = computeDeploymentHash(files);

    const created = await this.prisma.websiteDeployment.create({
      data: {
        businessId: params.businessId,
        generatedWebsiteId: params.generatedWebsite.id,
        generatedWebsiteVersion: params.generatedWebsite.configVersion,
        deploymentVersion,
        provider: toPrismaProviderName(this.deploymentProvider.name),
        providerVersion: this.deploymentProvider.version,
        environment: 'PRODUCTION',
        commitHash: params.commitHash ?? null,
        status: 'REQUESTED',
        deploymentHash,
        deploymentEngineVersion: DEPLOYMENT_ENGINE_VERSION,
        rollbackFromDeploymentId: params.rollbackFromDeploymentId ?? null,
        retryOfDeploymentId: params.retryOfDeploymentId ?? null,
        createdById: params.actorId ?? undefined,
      },
    });
    this.logger.log(
      `Deployment Requested: businessId=${params.businessId}, deploymentId=${created.id}, version=${deploymentVersion}`,
    );

    const buildStartedAt = new Date();
    await this.prisma.websiteDeployment.update({
      where: { id: created.id },
      data: { status: 'IN_PROGRESS', buildStartedAt },
    });
    this.logger.log(`Deployment Started: deploymentId=${created.id}`);

    const projectName = toProjectName(business.businessName, params.businessId);

    try {
      const result = await this.deploymentProvider.deploy({
        files: files.map((file) => ({ path: file.path, content: file.content })),
        projectName,
        environment: 'production',
      });

      const completedAt = new Date();
      const updated = await this.prisma.websiteDeployment.update({
        where: { id: created.id },
        data: {
          status: 'COMPLETED',
          providerDeploymentId: result.providerDeploymentId,
          liveUrl: result.liveUrl,
          buildCompletedAt: completedAt,
          completedAt,
          executionDuration: completedAt.getTime() - buildStartedAt.getTime(),
        },
      });
      this.logger.log(
        `Deployment Completed: deploymentId=${created.id}, liveUrl=${result.liveUrl}`,
      );

      await this.healthCheckEngineService.runCheck(updated.id, updated.liveUrl ?? '');
      const withHealth = await this.prisma.websiteDeployment.findUniqueOrThrow({
        where: { id: created.id },
      });
      return toWebsiteDeploymentResponse(withHealth);
    } catch (error) {
      const completedAt = new Date();
      const errorMessage = error instanceof Error ? error.message : String(error);
      const updated = await this.prisma.websiteDeployment.update({
        where: { id: created.id },
        data: {
          status: 'FAILED',
          errorMessage,
          completedAt,
          executionDuration: completedAt.getTime() - buildStartedAt.getTime(),
        },
      });
      this.logger.error(`Deployment Failed: deploymentId=${created.id}, error=${errorMessage}`);
      return toWebsiteDeploymentResponse(updated);
    }
  }

  /**
   * Build Validation (founder's explicit Decision 4): reads M9's already-
   * computed PreviewReport rules and fails fast on any `error`-severity
   * one — never re-runs validators itself (DECISIONS.md D-097). "Required
   * assets exist" is subsumed here too: the Structural Integrity
   * validator's own rules already check exactly that.
   */
  private async assertPublishReady(leadId: string): Promise<void> {
    const report = await this.websitePreviewService.getValidationReport(leadId);
    const failedRules = report.rules.filter((rule) => rule.status === 'error');
    if (failedRules.length > 0) {
      throw new DeploymentValidationFailedException(
        'This website is not ready to deploy — it has not passed publish-readiness validation',
        {
          failedRules: failedRules.map((rule) => ({ ruleId: rule.ruleId, message: rule.message })),
        },
      );
    }
  }

  private async nextDeploymentVersion(businessId: string): Promise<number> {
    const latest = await this.prisma.websiteDeployment.findFirst({
      where: { businessId },
      orderBy: { deploymentVersion: 'desc' },
      select: { deploymentVersion: true },
    });
    return (latest?.deploymentVersion ?? 0) + 1;
  }

  private async findRowOrThrow(businessId: string, deploymentId: string) {
    const deployment = await this.prisma.websiteDeployment.findUnique({
      where: { id: deploymentId },
    });
    if (!deployment || deployment.businessId !== businessId) {
      throw new WebsiteDeploymentNotFoundException();
    }
    return deployment;
  }

  private async latestGeneratedWebsite(businessId: string): Promise<GeneratedWebsite> {
    const generatedWebsite = await this.prisma.generatedWebsite.findFirst({
      where: { businessId },
      orderBy: { configVersion: 'desc' },
    });
    if (!generatedWebsite) {
      throw new GeneratedWebsiteNotFoundException();
    }
    return generatedWebsite;
  }

  private async resolveBusinessId(leadId: string): Promise<string> {
    const lead = await this.leadsService.findById(leadId);
    if (!lead) {
      throw new LeadNotFoundException();
    }
    return lead.businessId;
  }
}
