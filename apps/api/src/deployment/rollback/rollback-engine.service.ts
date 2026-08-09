import { Inject, Injectable, Logger } from '@nestjs/common';
import type { PrismaClient } from '@riznexia/db';
import type { WebsiteDeployment } from '@riznexia/shared-types';
import { LeadsService } from '../../leads/leads.service';
import { PRISMA_CLIENT } from '../../common/database/database.constants';
import {
  InvalidRollbackTargetException,
  LeadNotFoundException,
  WebsiteDeploymentNotFoundException,
} from '../../common/exceptions/app.exception';
import { DeploymentEngineService } from '../engine/deployment-engine.service';

// Module M11 (DECISIONS.md D-094) — Rollback Engine. Founder's explicit
// Decision 3: "Rollback must always target a previous successful
// deployment. Rollback is a new deployment event." This service never
// duplicates DeploymentEngineService's orchestration — it only resolves a
// valid target and its historical GeneratedWebsite snapshot, then
// delegates to `deployGeneratedWebsite()` with `rollbackFromDeploymentId`
// set. The target row itself is never touched.
@Injectable()
export class RollbackEngineService {
  private readonly logger = new Logger(RollbackEngineService.name);

  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    private readonly leadsService: LeadsService,
    private readonly deploymentEngineService: DeploymentEngineService,
  ) {}

  async rollbackTo(
    leadId: string,
    targetDeploymentId: string,
    actorId: string | null,
  ): Promise<WebsiteDeployment> {
    const businessId = await this.resolveBusinessId(leadId);
    const target = await this.prisma.websiteDeployment.findUnique({
      where: { id: targetDeploymentId },
    });
    if (!target || target.businessId !== businessId) {
      throw new WebsiteDeploymentNotFoundException();
    }
    if (target.status !== 'COMPLETED' || target.healthStatus !== 'HEALTHY') {
      throw new InvalidRollbackTargetException();
    }

    const generatedWebsite = await this.prisma.generatedWebsite.findUniqueOrThrow({
      where: { id: target.generatedWebsiteId },
    });

    this.logger.log(
      `Rollback Requested: businessId=${businessId}, targetDeploymentId=${targetDeploymentId}`,
    );
    const result = await this.deploymentEngineService.deployGeneratedWebsite({
      leadId,
      businessId,
      generatedWebsite,
      actorId,
      commitHash: target.commitHash,
      rollbackFromDeploymentId: targetDeploymentId,
    });

    if (result.status === 'completed') {
      this.logger.log(
        `Rollback Completed: businessId=${businessId}, targetDeploymentId=${targetDeploymentId}, newDeploymentId=${result.id}`,
      );
    }
    return result;
  }

  private async resolveBusinessId(leadId: string): Promise<string> {
    const lead = await this.leadsService.findById(leadId);
    if (!lead) {
      throw new LeadNotFoundException();
    }
    return lead.businessId;
  }
}
