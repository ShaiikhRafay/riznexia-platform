import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Prisma, PrismaClient } from '@riznexia/db';
import {
  aggregateReadiness,
  generateWebsitePreview,
  PREVIEW_ENGINE_VERSION,
  PUBLISH_READINESS_ENGINE_VERSION,
  runAllValidators,
  VALIDATION_ENGINE_VERSION,
  WEBSITE_PREVIEW_MODULE_VERSION,
} from '@riznexia/website-preview';
import type {
  BusinessAnalysisOutput,
  PreviewReport as PreviewReportResponse,
  PublishReadinessReport as PublishReadinessReportResponse,
  ThemeConfiguration as ThemeConfigurationResponse,
  ValidationRuleResult,
  WebsitePreview as WebsitePreviewResponse,
} from '@riznexia/shared-types';
import { LeadsService } from '../leads/leads.service';
import { PRISMA_CLIENT } from '../common/database/database.constants';
import {
  GeneratedWebsiteNotFoundException,
  LeadNotFoundException,
} from '../common/exceptions/app.exception';
import { toThemeConfigurationResponse } from '../theme-engine/dto/theme-configuration-response.dto';
import { toGeneratedWebsiteResponse } from '../website-assembly/dto/generated-website-response.dto';
import { toWebsitePreviewResponse } from './dto/website-preview-response.dto';
import { toPreviewReportResponse } from './dto/preview-report-response.dto';
import { toPublishReadinessReportResponse } from './dto/publish-readiness-report-response.dto';

// Module M9 — read-only (founder's Decision 1): this service never
// writes to GeneratedWebsite, never calls website-generator, and never
// regenerates layout/component/content. It only ever reads a GeneratedWebsite
// row plus its ThemeConfiguration/BusinessAnalysis and computes derived,
// independently-versioned/cached artifacts (Decision 2 — regenerate only
// when GeneratedWebsite.configVersion has advanced past the last cached
// row; otherwise return the cached one). Unlike M6-M8's POST-then-GET
// split, every M9 endpoint is a single GET that computes-and-caches —
// there is no external cost here to gate behind an explicit POST
// (no AI call, no third-party API), same reasoning as every validator
// being pure/deterministic/synchronous.
//
// Decision 3/"all reports must be generated independently": getValidationReport()
// and getReadinessReport() each independently call runAllValidators() —
// getReadinessReport() never reads a persisted PreviewReport row to get
// its rules, so it never depends on a prior /validation call having
// happened. PublishReadinessEngine itself only aggregates the rules it's
// handed; it never calls a validator.
@Injectable()
export class WebsitePreviewService {
  private readonly logger = new Logger(WebsitePreviewService.name);

  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    private readonly leadsService: LeadsService,
  ) {}

  async getPreview(leadId: string): Promise<WebsitePreviewResponse> {
    const businessId = await this.resolveBusinessId(leadId);
    const generatedWebsite = await this.latestGeneratedWebsite(businessId);

    const cached = await this.prisma.websitePreview.findFirst({
      where: { businessId },
      orderBy: { previewVersion: 'desc' },
    });
    if (cached && cached.generatedWebsiteVersion === generatedWebsite.configVersion) {
      this.logger.log(
        `Preview Opened (cached): businessId=${businessId}, generatedWebsiteId=${generatedWebsite.id}, previewId=${cached.id}`,
      );
      return toWebsitePreviewResponse(cached);
    }

    const themeConfiguration = await this.themeConfigurationFor(generatedWebsite);
    const generatedWebsiteResponse = toGeneratedWebsiteResponse(generatedWebsite);
    const content = generateWebsitePreview(generatedWebsiteResponse, themeConfiguration);

    const created = await this.prisma.$transaction(async (tx) => {
      const latest = await tx.websitePreview.findFirst({
        where: { businessId },
        orderBy: { previewVersion: 'desc' },
        select: { previewVersion: true },
      });
      const previewVersion = (latest?.previewVersion ?? 0) + 1;

      return tx.websitePreview.create({
        data: {
          businessId,
          generatedWebsiteId: generatedWebsite.id,
          previewVersion,
          generatedWebsiteVersion: generatedWebsite.configVersion,
          validationVersion: VALIDATION_ENGINE_VERSION,
          generatedByModuleVersion: WEBSITE_PREVIEW_MODULE_VERSION,
          businessName: content.businessName,
          themeName: content.themeName,
          themeId: content.themeId,
          devicePresets: content.devicePresets as unknown as Prisma.InputJsonValue,
          files: content.files as unknown as Prisma.InputJsonValue,
        },
      });
    });

    this.logger.log(
      `Preview Opened: businessId=${businessId}, generatedWebsiteId=${generatedWebsite.id}, previewId=${created.id}, engineVersion=${PREVIEW_ENGINE_VERSION}`,
    );
    return toWebsitePreviewResponse(created);
  }

  async getValidationReport(leadId: string): Promise<PreviewReportResponse> {
    const businessId = await this.resolveBusinessId(leadId);
    const generatedWebsite = await this.latestGeneratedWebsite(businessId);

    const cached = await this.prisma.previewReport.findFirst({
      where: { businessId },
      orderBy: { previewVersion: 'desc' },
    });
    if (cached && cached.generatedWebsiteVersion === generatedWebsite.configVersion) {
      this.logger.log(
        `Validation Started: businessId=${businessId}, generatedWebsiteId=${generatedWebsite.id} — returning cached report`,
      );
      this.logger.log(
        `Validation Completed (cached): reportId=${cached.id}, ruleCount=${(cached.rules as unknown as ValidationRuleResult[]).length}`,
      );
      return toPreviewReportResponse(cached);
    }

    this.logger.log(
      `Validation Started: businessId=${businessId}, generatedWebsiteId=${generatedWebsite.id}`,
    );
    const rules = await this.runValidatorsFor(generatedWebsite);
    const validationTimestamp = new Date();

    const created = await this.prisma.$transaction(async (tx) => {
      const latest = await tx.previewReport.findFirst({
        where: { businessId },
        orderBy: { previewVersion: 'desc' },
        select: { previewVersion: true },
      });
      const previewVersion = (latest?.previewVersion ?? 0) + 1;

      return tx.previewReport.create({
        data: {
          businessId,
          generatedWebsiteId: generatedWebsite.id,
          previewVersion,
          generatedWebsiteVersion: generatedWebsite.configVersion,
          validationVersion: VALIDATION_ENGINE_VERSION,
          generatedByModuleVersion: WEBSITE_PREVIEW_MODULE_VERSION,
          rules: rules as unknown as Prisma.InputJsonValue,
          validationTimestamp,
        },
      });
    });

    this.logger.log(
      `Validation Completed: reportId=${created.id}, ruleCount=${rules.length}, errorCount=${rules.filter((r) => r.status === 'error').length}`,
    );
    return toPreviewReportResponse(created);
  }

  async getReadinessReport(leadId: string): Promise<PublishReadinessReportResponse> {
    const businessId = await this.resolveBusinessId(leadId);
    const generatedWebsite = await this.latestGeneratedWebsite(businessId);

    const cached = await this.prisma.publishReadinessReport.findFirst({
      where: { businessId },
      orderBy: { previewVersion: 'desc' },
    });
    if (cached && cached.generatedWebsiteVersion === generatedWebsite.configVersion) {
      this.logger.log(
        `Publish Readiness Generated (cached): businessId=${businessId}, reportId=${cached.id}`,
      );
      return toPublishReadinessReportResponse(cached);
    }

    // Independently re-runs the validators — never reads a persisted
    // PreviewReport row (Decision 1/3: every report is generated
    // independently; PublishReadinessEngine only ever aggregates the
    // rules it's directly handed).
    const rules = await this.runValidatorsFor(generatedWebsite);
    const readiness = aggregateReadiness(rules);

    const created = await this.prisma.$transaction(async (tx) => {
      const latest = await tx.publishReadinessReport.findFirst({
        where: { businessId },
        orderBy: { previewVersion: 'desc' },
        select: { previewVersion: true },
      });
      const previewVersion = (latest?.previewVersion ?? 0) + 1;

      return tx.publishReadinessReport.create({
        data: {
          businessId,
          generatedWebsiteId: generatedWebsite.id,
          previewVersion,
          generatedWebsiteVersion: generatedWebsite.configVersion,
          validationVersion: VALIDATION_ENGINE_VERSION,
          generatedByModuleVersion: WEBSITE_PREVIEW_MODULE_VERSION,
          seoScore: readiness.seoScore as unknown as Prisma.InputJsonValue,
          accessibilityScore: readiness.accessibilityScore as unknown as Prisma.InputJsonValue,
          performanceScore: readiness.performanceScore as unknown as Prisma.InputJsonValue,
          contentCompletenessScore:
            readiness.contentCompletenessScore as unknown as Prisma.InputJsonValue,
          structuralIntegrityScore:
            readiness.structuralIntegrityScore as unknown as Prisma.InputJsonValue,
          overallPublishScore: readiness.overallPublishScore as unknown as Prisma.InputJsonValue,
        },
      });
    });

    this.logger.log(
      `Publish Readiness Generated: businessId=${businessId}, reportId=${created.id}, overallScore=${readiness.overallPublishScore.score}, engineVersion=${PUBLISH_READINESS_ENGINE_VERSION}`,
    );
    return toPublishReadinessReportResponse(created);
  }

  private async runValidatorsFor(
    generatedWebsite: Awaited<ReturnType<WebsitePreviewService['latestGeneratedWebsite']>>,
  ): Promise<ValidationRuleResult[]> {
    const [themeConfiguration, businessAnalysis] = await Promise.all([
      this.themeConfigurationFor(generatedWebsite),
      this.businessAnalysisFor(generatedWebsite),
    ]);
    const generatedWebsiteResponse = toGeneratedWebsiteResponse(generatedWebsite);
    return runAllValidators({
      files: generatedWebsiteResponse.files,
      businessAnalysis,
      themeConfiguration,
    });
  }

  private async themeConfigurationFor(generatedWebsite: {
    themeConfigurationId: string;
  }): Promise<ThemeConfigurationResponse> {
    const model = await this.prisma.themeConfiguration.findUniqueOrThrow({
      where: { id: generatedWebsite.themeConfigurationId },
    });
    return toThemeConfigurationResponse(model);
  }

  private async businessAnalysisFor(generatedWebsite: {
    businessAnalysisId: string;
  }): Promise<BusinessAnalysisOutput> {
    const analysis = await this.prisma.businessAnalysis.findUniqueOrThrow({
      where: { id: generatedWebsite.businessAnalysisId },
    });
    return analysis.brandBrief as unknown as BusinessAnalysisOutput;
  }

  private async latestGeneratedWebsite(businessId: string) {
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
