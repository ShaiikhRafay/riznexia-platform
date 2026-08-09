import { Inject, Injectable } from '@nestjs/common';
import type { PrismaClient } from '@riznexia/db';
import type { DeploymentStatusSnapshot } from '@riznexia/shared-types';
import { LeadsService } from '../../leads/leads.service';
import { PRISMA_CLIENT } from '../../common/database/database.constants';
import { LeadNotFoundException } from '../../common/exceptions/app.exception';
import { toDomainResponse } from '../domain/dto/domain-response.dto';
import { toWebsiteDeploymentResponse } from './dto/website-deployment-response.dto';

// Module M11 — the founder's "DeploymentStatus" output is not a stored
// table: it's computed fresh on every request from WebsiteDeployment and
// Domain, the same "compute fresh, nothing new stored" pattern as
// WebsiteGenerationStatus (DECISIONS.md D-088). Folded into the
// Deployment Engine's own folder rather than a separate module, matching
// how WebsiteStatusService was folded into the Pipeline Engine (M10).
@Injectable()
export class DeploymentStatusService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    private readonly leadsService: LeadsService,
  ) {}

  async getForLead(leadId: string): Promise<DeploymentStatusSnapshot> {
    const businessId = await this.resolveBusinessId(leadId);

    const latestDeployment = await this.prisma.websiteDeployment.findFirst({
      where: { businessId },
      orderBy: { deploymentVersion: 'desc' },
    });
    const domain = await this.prisma.domain.findFirst({
      where: { businessId },
      orderBy: { createdAt: 'asc' },
    });

    const productionReady =
      latestDeployment?.status === 'COMPLETED' && latestDeployment?.healthStatus === 'HEALTHY';

    return {
      generatedAt: new Date().toISOString(),
      leadId,
      latestDeployment: latestDeployment ? toWebsiteDeploymentResponse(latestDeployment) : null,
      domain: domain ? toDomainResponse(domain) : null,
      productionReady,
    };
  }

  private async resolveBusinessId(leadId: string): Promise<string> {
    const lead = await this.leadsService.findById(leadId);
    if (!lead) {
      throw new LeadNotFoundException();
    }
    return lead.businessId;
  }
}
