import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Prisma, PrismaClient } from '@riznexia/db';
import { generateComponentManifest, validateComponentManifest } from '@riznexia/website-generator';
import type {
  BusinessAnalysisOutput,
  ComponentManifest as ComponentManifestResponse,
} from '@riznexia/shared-types';
import { LeadsService } from '../leads/leads.service';
import { PRISMA_CLIENT } from '../common/database/database.constants';
import {
  LayoutConfigurationNotFoundException,
  LeadNotFoundException,
} from '../common/exceptions/app.exception';
import { toThemeConfigurationResponse } from '../theme-engine/dto/theme-configuration-response.dto';
import { toLayoutConfigurationResponse } from '../layout-engine/dto/layout-configuration-response.dto';
import { toComponentManifestResponse } from './dto/component-manifest-response.dto';

export interface GenerateComponentManifestResult {
  configuration: ComponentManifestResponse;
  cacheHit: boolean;
}

// Module M8.2 — POST /leads/:id/components orchestration, mirroring
// LayoutGenerationService's shape (cache check, then generate + persist).
// generateComponentManifest() is pure and synchronous, same as M8.1's
// generateLayout() — no AI step, so no resilience branch is needed here;
// a missing LayoutConfiguration is the only real failure mode, and a
// validateComponentManifest() failure is an internal bug (propagates as
// an unhandled 500, same semantics as M8.1's D-052).
@Injectable()
export class ComponentGenerationService {
  private readonly logger = new Logger(ComponentGenerationService.name);

  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    private readonly leadsService: LeadsService,
  ) {}

  async findLatestForLead(leadId: string): Promise<ComponentManifestResponse | null> {
    const businessId = await this.resolveBusinessId(leadId);
    const latest = await this.prisma.componentManifest.findFirst({
      where: { businessId },
      orderBy: { configVersion: 'desc' },
    });
    return latest ? toComponentManifestResponse(latest) : null;
  }

  async generateComponentManifestForLead(leadId: string): Promise<GenerateComponentManifestResult> {
    const businessId = await this.resolveBusinessId(leadId);

    const latestLayoutConfig = await this.prisma.layoutConfiguration.findFirst({
      where: { businessId },
      orderBy: { configVersion: 'desc' },
    });
    if (!latestLayoutConfig) {
      throw new LayoutConfigurationNotFoundException();
    }

    const existing = await this.prisma.componentManifest.findFirst({
      where: { businessId, layoutConfigurationId: latestLayoutConfig.id },
      orderBy: { configVersion: 'desc' },
    });
    if (existing) {
      this.logger.log(
        `Cache hit: businessId=${businessId}, layoutConfigurationId=${latestLayoutConfig.id}, componentManifestId=${existing.id}`,
      );
      return { configuration: toComponentManifestResponse(existing), cacheHit: true };
    }

    // LayoutConfiguration.themeConfigurationId/businessAnalysisId always
    // resolve — M8.1's own hard dependency on a persisted ThemeConfiguration
    // (ThemeConfigurationNotFoundException) guarantees both rows exist.
    const [themeConfigModel, analysis] = await Promise.all([
      this.prisma.themeConfiguration.findUniqueOrThrow({
        where: { id: latestLayoutConfig.themeConfigurationId },
      }),
      this.prisma.businessAnalysis.findUniqueOrThrow({
        where: { id: latestLayoutConfig.businessAnalysisId },
      }),
    ]);

    const brandBrief = analysis.brandBrief as unknown as BusinessAnalysisOutput;
    const themeConfiguration = toThemeConfigurationResponse(themeConfigModel);
    const layoutConfiguration = toLayoutConfigurationResponse(latestLayoutConfig);

    const content = generateComponentManifest(brandBrief, themeConfiguration, layoutConfiguration);
    validateComponentManifest(content);

    const created = await this.prisma.$transaction(async (tx) => {
      const latestConfig = await tx.componentManifest.findFirst({
        where: { businessId },
        orderBy: { configVersion: 'desc' },
        select: { configVersion: true },
      });
      const configVersion = (latestConfig?.configVersion ?? 0) + 1;

      return tx.componentManifest.create({
        data: {
          businessId,
          businessAnalysisId: latestLayoutConfig.businessAnalysisId,
          themeConfigurationId: latestLayoutConfig.themeConfigurationId,
          layoutConfigurationId: latestLayoutConfig.id,
          configVersion,

          componentEngineVersion: content.componentEngineVersion,
          themeTokens: content.themeTokens as unknown as Prisma.InputJsonValue,
          components: content.components as unknown as Prisma.InputJsonValue,
        },
      });
    });

    this.logger.log(
      `Component manifest completed: businessId=${businessId}, layoutConfigurationId=${latestLayoutConfig.id}, componentCount=${content.components.length}`,
    );

    return { configuration: toComponentManifestResponse(created), cacheHit: false };
  }

  private async resolveBusinessId(leadId: string): Promise<string> {
    const lead = await this.leadsService.findById(leadId);
    if (!lead) {
      throw new LeadNotFoundException();
    }
    return lead.businessId;
  }
}
