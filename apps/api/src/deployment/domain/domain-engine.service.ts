import { Inject, Injectable, Logger } from '@nestjs/common';
import { DomainType as PrismaDomainType, Prisma, type PrismaClient } from '@riznexia/db';
import type { CreateDomainInput, Domain } from '@riznexia/shared-types';
import { LeadsService } from '../../leads/leads.service';
import { PRISMA_CLIENT } from '../../common/database/database.constants';
import {
  DomainNotFoundException,
  LeadNotFoundException,
} from '../../common/exceptions/app.exception';
import {
  DEPLOYMENT_PROVIDER,
  type DeploymentProvider,
} from '../provider/deployment-provider.interface';
import { toPrismaProviderName } from '../deployment.mapper';
import { toDomainResponse } from './dto/domain-response.dto';

const API_TO_PRISMA_TYPE: Record<'custom' | 'subdomain', PrismaDomainType> = {
  custom: PrismaDomainType.CUSTOM,
  subdomain: PrismaDomainType.SUBDOMAIN,
};

// Module M11 (DECISIONS.md D-096) — Domain Engine. Founder's explicit
// Decision 6: metadata and provider-integration status only — never DNS
// automation, never SSL certificate issuance, never a registrar API call.
// `attachDomain` (optional on DeploymentProvider) is a best-effort call:
// if the active provider doesn't implement it, or the call itself fails,
// the Domain row is still created/verified with verificationStatus
// staying PENDING — this engine's own architecture is reserved for
// future providers, not a hard requirement this phase.
@Injectable()
export class DomainEngineService {
  private readonly logger = new Logger(DomainEngineService.name);

  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    @Inject(DEPLOYMENT_PROVIDER) private readonly deploymentProvider: DeploymentProvider,
    private readonly leadsService: LeadsService,
  ) {}

  async listForLead(leadId: string): Promise<Domain[]> {
    const businessId = await this.resolveBusinessId(leadId);
    const rows = await this.prisma.domain.findMany({
      where: { businessId },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(toDomainResponse);
  }

  async findByIdOrThrow(leadId: string, domainId: string): Promise<Domain> {
    const businessId = await this.resolveBusinessId(leadId);
    const domain = await this.findRowOrThrow(businessId, domainId);
    return toDomainResponse(domain);
  }

  async create(leadId: string, input: CreateDomainInput): Promise<Domain> {
    const businessId = await this.resolveBusinessId(leadId);

    const latestDeployment = await this.prisma.websiteDeployment.findFirst({
      where: { businessId, status: 'COMPLETED' },
      orderBy: { deploymentVersion: 'desc' },
    });

    const created = await this.prisma.domain.create({
      data: {
        businessId,
        hostname: input.hostname,
        type: API_TO_PRISMA_TYPE[input.type],
        provider: toPrismaProviderName(this.deploymentProvider.name),
        currentDeploymentId: latestDeployment?.id ?? null,
      },
    });
    this.logger.log(
      `Domain registered: businessId=${businessId}, domainId=${created.id}, hostname=${created.hostname}`,
    );

    if (!latestDeployment?.providerDeploymentId) {
      return toDomainResponse(created);
    }
    return this.attemptVerification(
      created.id,
      latestDeployment.providerDeploymentId,
      created.hostname,
    );
  }

  async verify(leadId: string, domainId: string): Promise<Domain> {
    const businessId = await this.resolveBusinessId(leadId);
    const domain = await this.findRowOrThrow(businessId, domainId);

    if (!domain.currentDeploymentId) {
      return toDomainResponse(domain);
    }
    const deployment = await this.prisma.websiteDeployment.findUnique({
      where: { id: domain.currentDeploymentId },
    });
    if (!deployment?.providerDeploymentId) {
      return toDomainResponse(domain);
    }
    return this.attemptVerification(domain.id, deployment.providerDeploymentId, domain.hostname);
  }

  /**
   * Real Vercel domains get SSL auto-provisioned the moment they verify
   * (Let's Encrypt, managed entirely by the provider) — so `sslStatus`
   * tracks alongside `verificationStatus` rather than needing a separate
   * "check SSL" provider call this module deliberately doesn't build
   * (founder's Decision 6: no SSL issuance here).
   */
  private async attemptVerification(
    domainId: string,
    providerDeploymentId: string,
    hostname: string,
  ): Promise<Domain> {
    if (!this.deploymentProvider.attachDomain) {
      const domain = await this.prisma.domain.findUniqueOrThrow({ where: { id: domainId } });
      return toDomainResponse(domain);
    }

    try {
      const attachment = await this.deploymentProvider.attachDomain(providerDeploymentId, hostname);
      const updated = await this.prisma.domain.update({
        where: { id: domainId },
        data: {
          verificationStatus: attachment.verified ? 'VERIFIED' : 'PENDING',
          verificationRecord:
            (attachment.verificationRecord as Prisma.InputJsonValue | null) ?? Prisma.JsonNull,
          sslStatus: attachment.verified ? 'ACTIVE' : 'PENDING',
        },
      });
      return toDomainResponse(updated);
    } catch (error) {
      this.logger.warn(
        `Domain verification attempt failed (non-fatal): domainId=${domainId}, error=${error instanceof Error ? error.message : String(error)}`,
      );
      const domain = await this.prisma.domain.findUniqueOrThrow({ where: { id: domainId } });
      return toDomainResponse(domain);
    }
  }

  private async findRowOrThrow(businessId: string, domainId: string) {
    const domain = await this.prisma.domain.findUnique({ where: { id: domainId } });
    if (!domain || domain.businessId !== businessId) {
      throw new DomainNotFoundException();
    }
    return domain;
  }

  private async resolveBusinessId(leadId: string): Promise<string> {
    const lead = await this.leadsService.findById(leadId);
    if (!lead) {
      throw new LeadNotFoundException();
    }
    return lead.businessId;
  }
}
