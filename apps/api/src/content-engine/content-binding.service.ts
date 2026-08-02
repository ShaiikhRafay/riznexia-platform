import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Prisma, PrismaClient } from '@riznexia/db';
import { generateContentManifest, validateContentManifest } from '@riznexia/website-generator';
import type {
  BusinessAnalysisOutput,
  ContentManifest as ContentManifestResponse,
} from '@riznexia/shared-types';
import { BusinessService } from '../business/business.service';
import { LeadsService } from '../leads/leads.service';
import { PRISMA_CLIENT } from '../common/database/database.constants';
import {
  BusinessNotFoundException,
  ComponentManifestNotFoundException,
  LeadNotFoundException,
} from '../common/exceptions/app.exception';
import { toThemeConfigurationResponse } from '../theme-engine/dto/theme-configuration-response.dto';
import { toLayoutConfigurationResponse } from '../layout-engine/dto/layout-configuration-response.dto';
import { toComponentManifestResponse } from '../component-engine/dto/component-manifest-response.dto';
import { toBusinessContactInfo } from './dto/business-contact-info.mapper';
import { toContentManifestResponse } from './dto/content-manifest-response.dto';

export interface BindContentResult {
  configuration: ContentManifestResponse;
  cacheHit: boolean;
}

// Module M8.3 — POST /leads/:id/content orchestration, mirroring
// ComponentGenerationService's shape (cache check, then bind + persist).
// generateContentManifest() is pure and synchronous, no AI step — a
// missing ComponentManifest is the only real failure mode, and a
// validateContentManifest() failure is an internal bug (propagates as an
// unhandled 500, same semantics as M8.1/M8.2's D-052/D-060).
@Injectable()
export class ContentBindingService {
  private readonly logger = new Logger(ContentBindingService.name);

  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    private readonly leadsService: LeadsService,
    private readonly businessService: BusinessService,
  ) {}

  async findLatestForLead(leadId: string): Promise<ContentManifestResponse | null> {
    const businessId = await this.resolveBusinessId(leadId);
    const latest = await this.prisma.contentManifest.findFirst({
      where: { businessId },
      orderBy: { configVersion: 'desc' },
    });
    return latest ? toContentManifestResponse(latest) : null;
  }

  async bindContentForLead(leadId: string): Promise<BindContentResult> {
    const businessId = await this.resolveBusinessId(leadId);

    const latestComponentManifest = await this.prisma.componentManifest.findFirst({
      where: { businessId },
      orderBy: { configVersion: 'desc' },
    });
    if (!latestComponentManifest) {
      throw new ComponentManifestNotFoundException();
    }

    const existing = await this.prisma.contentManifest.findFirst({
      where: { businessId, componentManifestId: latestComponentManifest.id },
      orderBy: { configVersion: 'desc' },
    });
    if (existing) {
      this.logger.log(
        `Cache hit: businessId=${businessId}, componentManifestId=${latestComponentManifest.id}, contentManifestId=${existing.id}`,
      );
      return { configuration: toContentManifestResponse(existing), cacheHit: true };
    }

    // ComponentManifest's own businessAnalysisId/themeConfigurationId/
    // layoutConfigurationId always resolve — M8.2's own hard dependency on
    // M8.1 (LayoutConfigurationNotFoundException) guarantees all three rows exist.
    const [themeConfigModel, layoutConfigModel, analysis, business] = await Promise.all([
      this.prisma.themeConfiguration.findUniqueOrThrow({
        where: { id: latestComponentManifest.themeConfigurationId },
      }),
      this.prisma.layoutConfiguration.findUniqueOrThrow({
        where: { id: latestComponentManifest.layoutConfigurationId },
      }),
      this.prisma.businessAnalysis.findUniqueOrThrow({
        where: { id: latestComponentManifest.businessAnalysisId },
      }),
      this.businessService.findById(businessId),
    ]);
    if (!business) {
      throw new BusinessNotFoundException();
    }

    const brandBrief = analysis.brandBrief as unknown as BusinessAnalysisOutput;
    const businessContactInfo = toBusinessContactInfo(business);
    const themeConfiguration = toThemeConfigurationResponse(themeConfigModel);
    const layoutConfiguration = toLayoutConfigurationResponse(layoutConfigModel);
    const componentManifest = toComponentManifestResponse(latestComponentManifest);

    const content = generateContentManifest(
      brandBrief,
      businessContactInfo,
      themeConfiguration,
      layoutConfiguration,
      componentManifest,
    );
    validateContentManifest(content, componentManifest);

    const created = await this.prisma.$transaction(async (tx) => {
      const latestConfig = await tx.contentManifest.findFirst({
        where: { businessId },
        orderBy: { configVersion: 'desc' },
        select: { configVersion: true },
      });
      const configVersion = (latestConfig?.configVersion ?? 0) + 1;

      return tx.contentManifest.create({
        data: {
          businessId,
          businessAnalysisId: latestComponentManifest.businessAnalysisId,
          themeConfigurationId: latestComponentManifest.themeConfigurationId,
          layoutConfigurationId: latestComponentManifest.layoutConfigurationId,
          componentManifestId: latestComponentManifest.id,
          configVersion,

          contentEngineVersion: content.contentEngineVersion,
          componentContent: content.componentContent as unknown as Prisma.InputJsonValue,
          unresolvedBindings: content.unresolvedBindings as unknown as Prisma.InputJsonValue,
          seoMetadata: content.seoMetadata as unknown as Prisma.InputJsonValue,
          structuredData: content.structuredData as unknown as Prisma.InputJsonValue,
        },
      });
    });

    this.logger.log(
      `Content manifest completed: businessId=${businessId}, componentManifestId=${latestComponentManifest.id}, boundFields=${content.componentContent.length}, unresolved=${content.unresolvedBindings.length}`,
    );

    return { configuration: toContentManifestResponse(created), cacheHit: false };
  }

  private async resolveBusinessId(leadId: string): Promise<string> {
    const lead = await this.leadsService.findById(leadId);
    if (!lead) {
      throw new LeadNotFoundException();
    }
    return lead.businessId;
  }
}
