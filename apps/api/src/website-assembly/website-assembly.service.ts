import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Prisma, PrismaClient } from '@riznexia/db';
import {
  assembleWebsite,
  ASSEMBLY_ENGINE_VERSION,
  validateWebsiteAssembly,
} from '@riznexia/website-generator';
import type { GeneratedWebsite as GeneratedWebsiteResponse } from '@riznexia/shared-types';
import { LeadsService } from '../leads/leads.service';
import { PRISMA_CLIENT } from '../common/database/database.constants';
import {
  ContentManifestNotFoundException,
  LeadNotFoundException,
} from '../common/exceptions/app.exception';
import { toThemeConfigurationResponse } from '../theme-engine/dto/theme-configuration-response.dto';
import { toLayoutConfigurationResponse } from '../layout-engine/dto/layout-configuration-response.dto';
import { toComponentManifestResponse } from '../component-engine/dto/component-manifest-response.dto';
import { toContentManifestResponse } from '../content-engine/dto/content-manifest-response.dto';
import { toGeneratedWebsiteResponse } from './dto/generated-website-response.dto';

export interface AssembleWebsiteResult {
  website: GeneratedWebsiteResponse;
  cacheHit: boolean;
}

// Module M8.4 — POST /leads/:id/website orchestration, mirroring
// ContentBindingService's shape (cache check, then generate + persist).
// assembleWebsite() is pure and synchronous, no AI step — a missing
// ContentManifest is the only real failure mode, and a
// validateWebsiteAssembly() failure is an internal bug (propagates as an
// unhandled 500, same semantics as M8.1-M8.3's D-052/D-060/D-061+).
//
// Unlike ContentBindingService, this service never touches BusinessModule
// or the raw Business record — every field assembleWebsite() needs
// (including the business name) was already carried through into
// ThemeConfiguration/ComponentManifest/ContentManifest by the time this
// phase runs (see website-assembler.ts's extractBusinessName()).
@Injectable()
export class WebsiteAssemblyService {
  private readonly logger = new Logger(WebsiteAssemblyService.name);

  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    private readonly leadsService: LeadsService,
  ) {}

  async findLatestForLead(leadId: string): Promise<GeneratedWebsiteResponse | null> {
    const businessId = await this.resolveBusinessId(leadId);
    const latest = await this.prisma.generatedWebsite.findFirst({
      where: { businessId },
      orderBy: { configVersion: 'desc' },
    });
    return latest ? toGeneratedWebsiteResponse(latest) : null;
  }

  async assembleWebsiteForLead(leadId: string): Promise<AssembleWebsiteResult> {
    const businessId = await this.resolveBusinessId(leadId);

    const latestContentManifest = await this.prisma.contentManifest.findFirst({
      where: { businessId },
      orderBy: { configVersion: 'desc' },
    });
    if (!latestContentManifest) {
      throw new ContentManifestNotFoundException();
    }

    const existing = await this.prisma.generatedWebsite.findFirst({
      where: { businessId, contentManifestId: latestContentManifest.id },
      orderBy: { configVersion: 'desc' },
    });
    if (existing) {
      this.logger.log(
        `Cache hit: businessId=${businessId}, contentManifestId=${latestContentManifest.id}, generatedWebsiteId=${existing.id}`,
      );
      return { website: toGeneratedWebsiteResponse(existing), cacheHit: true };
    }

    // ContentManifest's own themeConfigurationId/layoutConfigurationId/
    // componentManifestId always resolve — M8.3's own hard dependency on
    // M8.2 (ComponentManifestNotFoundException) guarantees all three rows exist.
    const [themeConfigModel, layoutConfigModel, componentManifestModel] = await Promise.all([
      this.prisma.themeConfiguration.findUniqueOrThrow({
        where: { id: latestContentManifest.themeConfigurationId },
      }),
      this.prisma.layoutConfiguration.findUniqueOrThrow({
        where: { id: latestContentManifest.layoutConfigurationId },
      }),
      this.prisma.componentManifest.findUniqueOrThrow({
        where: { id: latestContentManifest.componentManifestId },
      }),
    ]);

    const themeConfiguration = toThemeConfigurationResponse(themeConfigModel);
    const layoutConfiguration = toLayoutConfigurationResponse(layoutConfigModel);
    const componentManifest = toComponentManifestResponse(componentManifestModel);
    const contentManifest = toContentManifestResponse(latestContentManifest);

    const files = assembleWebsite({
      themeConfiguration,
      layoutConfiguration,
      componentManifest,
      contentManifest,
    });
    validateWebsiteAssembly(files, componentManifest, contentManifest, layoutConfiguration);

    const created = await this.prisma.$transaction(async (tx) => {
      const latestConfig = await tx.generatedWebsite.findFirst({
        where: { businessId },
        orderBy: { configVersion: 'desc' },
        select: { configVersion: true },
      });
      const configVersion = (latestConfig?.configVersion ?? 0) + 1;

      return tx.generatedWebsite.create({
        data: {
          businessId,
          businessAnalysisId: latestContentManifest.businessAnalysisId,
          themeConfigurationId: latestContentManifest.themeConfigurationId,
          layoutConfigurationId: latestContentManifest.layoutConfigurationId,
          componentManifestId: latestContentManifest.componentManifestId,
          contentManifestId: latestContentManifest.id,
          configVersion,

          assemblyEngineVersion: ASSEMBLY_ENGINE_VERSION,
          files: files as unknown as Prisma.InputJsonValue,
        },
      });
    });

    this.logger.log(
      `Website assembled: businessId=${businessId}, contentManifestId=${latestContentManifest.id}, generatedWebsiteId=${created.id}, fileCount=${files.length}`,
    );

    return { website: toGeneratedWebsiteResponse(created), cacheHit: false };
  }

  private async resolveBusinessId(leadId: string): Promise<string> {
    const lead = await this.leadsService.findById(leadId);
    if (!lead) {
      throw new LeadNotFoundException();
    }
    return lead.businessId;
  }
}
