import { Inject, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@riznexia/db';
import type { PrismaClient } from '@riznexia/db';
import { generateLayout, validateLayoutConfiguration } from '@riznexia/website-generator';
import type {
  BusinessAnalysisOutput,
  LayoutConfiguration as LayoutConfigurationResponse,
} from '@riznexia/shared-types';
import { LeadsService } from '../leads/leads.service';
import { PRISMA_CLIENT } from '../common/database/database.constants';
import {
  LeadNotFoundException,
  ThemeConfigurationNotFoundException,
} from '../common/exceptions/app.exception';
import { toThemeConfigurationResponse } from '../theme-engine/dto/theme-configuration-response.dto';
import { toLayoutConfigurationResponse } from './dto/layout-configuration-response.dto';

export interface GenerateLayoutResult {
  configuration: LayoutConfigurationResponse;
  cacheHit: boolean;
}

// Module M8.1 — POST /leads/:id/layout orchestration, mirroring
// ThemeSelectionService's shape (cache check, then generate + persist)
// minus any AI step: generateLayout() is pure and synchronous, so there is
// no "AI recommends, proceed regardless" resilience branch here — a
// missing ThemeConfiguration is the only real failure mode, and a
// validateLayoutConfiguration() failure is an internal bug (thrown as a
// plain Error, not caught here — propagates as an unhandled 500, per the
// founder's resolved fork on M8.1's validation-failure semantics).
@Injectable()
export class LayoutGenerationService {
  private readonly logger = new Logger(LayoutGenerationService.name);

  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    private readonly leadsService: LeadsService,
  ) {}

  async findLatestForLead(leadId: string): Promise<LayoutConfigurationResponse | null> {
    const businessId = await this.resolveBusinessId(leadId);
    const latest = await this.prisma.layoutConfiguration.findFirst({
      where: { businessId },
      orderBy: { configVersion: 'desc' },
    });
    return latest ? toLayoutConfigurationResponse(latest) : null;
  }

  async generateLayoutForLead(leadId: string): Promise<GenerateLayoutResult> {
    const businessId = await this.resolveBusinessId(leadId);

    const latestThemeConfig = await this.prisma.themeConfiguration.findFirst({
      where: { businessId },
      orderBy: { configVersion: 'desc' },
    });
    if (!latestThemeConfig) {
      throw new ThemeConfigurationNotFoundException();
    }

    const existing = await this.prisma.layoutConfiguration.findFirst({
      where: { businessId, themeConfigurationId: latestThemeConfig.id },
      orderBy: { configVersion: 'desc' },
    });
    if (existing) {
      this.logger.log(
        `Cache hit: businessId=${businessId}, themeConfigurationId=${latestThemeConfig.id}, layoutConfigId=${existing.id}`,
      );
      return { configuration: toLayoutConfigurationResponse(existing), cacheHit: true };
    }

    // ThemeConfiguration.businessAnalysisId always resolves — M7's own
    // hard dependency on a COMPLETED BusinessAnalysis (BusinessAnalysisNotFoundException)
    // guarantees this row exists with a non-null brandBrief.
    const analysis = await this.prisma.businessAnalysis.findUniqueOrThrow({
      where: { id: latestThemeConfig.businessAnalysisId },
    });
    const brandBrief = analysis.brandBrief as unknown as BusinessAnalysisOutput;
    const themeConfiguration = toThemeConfigurationResponse(latestThemeConfig);

    const content = generateLayout(brandBrief, themeConfiguration);
    validateLayoutConfiguration(content, themeConfiguration);

    const created = await this.prisma.$transaction(async (tx) => {
      const latestConfig = await tx.layoutConfiguration.findFirst({
        where: { businessId },
        orderBy: { configVersion: 'desc' },
        select: { configVersion: true },
      });
      const configVersion = (latestConfig?.configVersion ?? 0) + 1;

      return tx.layoutConfiguration.create({
        data: {
          businessId,
          businessAnalysisId: latestThemeConfig.businessAnalysisId,
          themeConfigurationId: latestThemeConfig.id,
          configVersion,

          layoutEngineVersion: content.layoutEngineVersion,
          pageStructure: content.pageStructure as unknown as Prisma.InputJsonValue,
          navigation: content.navigation as unknown as Prisma.InputJsonValue,
          hero: content.hero as unknown as Prisma.InputJsonValue,
          footer: content.footer as unknown as Prisma.InputJsonValue,
          sidebar: (content.sidebar as unknown as Prisma.InputJsonValue | null) ?? Prisma.JsonNull,
          grid: content.grid as unknown as Prisma.InputJsonValue,
          responsiveRules: content.responsiveRules as unknown as Prisma.InputJsonValue,
          ctaPlacements: content.ctaPlacements as unknown as Prisma.InputJsonValue,
          componentPlaceholders: content.componentPlaceholders as unknown as Prisma.InputJsonValue,
        },
      });
    });

    this.logger.log(
      `Layout configuration completed: businessId=${businessId}, themeConfigurationId=${latestThemeConfig.id}, sectionCount=${content.pageStructure.length}`,
    );

    return { configuration: toLayoutConfigurationResponse(created), cacheHit: false };
  }

  private async resolveBusinessId(leadId: string): Promise<string> {
    const lead = await this.leadsService.findById(leadId);
    if (!lead) {
      throw new LeadNotFoundException();
    }
    return lead.businessId;
  }
}
