import { Inject, Injectable, Logger } from '@nestjs/common';
import { AnalysisStatus as PrismaAnalysisStatus } from '@riznexia/db';
import type { AiProviderName, Prisma, PrismaClient } from '@riznexia/db';
import { AiService } from '@riznexia/ai';
import { rankThemes, THEME_PROVIDER, type ThemeProvider } from '@riznexia/themes';
import type {
  BusinessAnalysisOutput,
  ThemeConfiguration as ThemeConfigurationResponse,
} from '@riznexia/shared-types';
import { BusinessService } from '../business/business.service';
import { LeadsService } from '../leads/leads.service';
import { PRISMA_CLIENT } from '../common/database/database.constants';
import { CostService } from '../common/cost/cost.service';
import { AI_THEME_RECOMMENDATION_ESTIMATED_COST_USD } from '../common/cost/cost.constants';
import { computeActualAiCostUsd } from '../common/cost/ai-cost.util';
import {
  BusinessAnalysisNotFoundException,
  BusinessNotFoundException,
  LeadNotFoundException,
  ThemeNotFoundException,
} from '../common/exceptions/app.exception';
import { THEME_ENGINE_VERSION } from './theme-engine.constants';
import { toThemeConfigurationResponse } from './dto/theme-configuration-response.dto';
import {
  toPrismaAnimationLevel,
  toPrismaCardStyle,
  toPrismaCtaStyle,
  toPrismaFooterStyle,
  toPrismaHeroStyle,
  toPrismaImageStyle,
  toPrismaNavigationStyle,
} from './theme-style.mapper';

interface AiRecommendationUsage {
  provider: AiProviderName;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
  executionTimeMs: number;
}

export interface SelectThemeResult {
  configuration: ThemeConfigurationResponse;
  cacheHit: boolean;
}

// Module M7 — POST /leads/:id/theme orchestration, mirroring
// BusinessAnalysisService's split (this service owns the cache check,
// AI-recommends step, rule-based ranking, and persistence — synchronous,
// unlike M6's fire-and-forget dispatch, since a lightweight single-attempt
// AI classification plus deterministic scoring is fast enough to run
// within the request).
@Injectable()
export class ThemeSelectionService {
  private readonly logger = new Logger(ThemeSelectionService.name);

  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    private readonly leadsService: LeadsService,
    private readonly businessService: BusinessService,
    @Inject(THEME_PROVIDER) private readonly themeProvider: ThemeProvider,
    private readonly aiService: AiService,
    private readonly costService: CostService,
  ) {}

  /**
   * GET /leads/:id/theme — the latest configuration for this lead's
   * business, or null if none has ever been selected.
   */
  async findLatestForLead(leadId: string): Promise<ThemeConfigurationResponse | null> {
    const businessId = await this.resolveBusinessId(leadId);
    const latest = await this.prisma.themeConfiguration.findFirst({
      where: { businessId },
      orderBy: { configVersion: 'desc' },
    });
    return latest ? toThemeConfigurationResponse(latest) : null;
  }

  /**
   * POST /leads/:id/theme — AI recommends (best-effort, one lightweight
   * classification call), rules validate and rank every registered theme,
   * the top-scoring compatible theme is selected. Cached per
   * businessAnalysisId: re-selecting against the same, unchanged analysis
   * returns the existing configuration rather than re-running selection.
   */
  async selectTheme(leadId: string): Promise<SelectThemeResult> {
    const businessId = await this.resolveBusinessId(leadId);
    const business = await this.businessService.findById(businessId);
    if (!business) {
      throw new BusinessNotFoundException();
    }

    const latestAnalysis = await this.prisma.businessAnalysis.findFirst({
      where: { businessId, status: PrismaAnalysisStatus.COMPLETED },
      orderBy: { analysisVersion: 'desc' },
    });
    if (!latestAnalysis || !latestAnalysis.brandBrief) {
      throw new BusinessAnalysisNotFoundException(
        'No completed business analysis exists yet for this lead — run business analysis (POST /leads/:id/business) before theme selection',
      );
    }

    const existing = await this.prisma.themeConfiguration.findFirst({
      where: { businessId, businessAnalysisId: latestAnalysis.id },
      orderBy: { configVersion: 'desc' },
    });
    if (existing) {
      this.logger.log(
        `Cache hit: businessId=${businessId}, businessAnalysisId=${latestAnalysis.id}, themeConfigId=${existing.id}`,
      );
      return { configuration: toThemeConfigurationResponse(existing), cacheHit: true };
    }

    const brandBrief = latestAnalysis.brandBrief as unknown as BusinessAnalysisOutput;
    const registeredThemes = this.themeProvider.listThemes();

    // AI recommends (best-effort) — recommendThemeCategory never throws by
    // its own contract, but this module never lets a theme-selection
    // request fail because of the AI step regardless. D-048: the
    // pre-flight CostService.charge() reservation is folded into this same
    // try/catch — a QuotaExceededException (monthly ceiling reached) is
    // handled identically to any other AI-step failure, i.e. rules-only
    // selection proceeds unaffected.
    let aiRecommendedThemeId: string | undefined;
    let aiRecommendationConfidence: number | undefined;
    let aiUsage: AiRecommendationUsage | undefined;
    try {
      await this.costService.charge(
        'theme_ai_recommendation',
        AI_THEME_RECOMMENDATION_ESTIMATED_COST_USD,
        {
          businessId,
        },
      );

      const startedAt = Date.now();
      const recommendation = await this.aiService.recommendThemeCategory({
        industry: brandBrief.industry,
        businessCategory: business.category,
        primaryServices: brandBrief.primaryServices,
        targetAudience: brandBrief.targetAudience,
        websiteSections: brandBrief.websiteSections,
        registeredThemeIds: registeredThemes.map((theme) => theme.id),
      });
      const executionTimeMs = Date.now() - startedAt;

      if (recommendation.status === 'completed') {
        aiUsage = {
          provider: recommendation.aiProvider as AiProviderName,
          model: recommendation.aiModel,
          promptTokens: recommendation.promptTokens,
          completionTokens: recommendation.completionTokens,
          totalTokens: recommendation.promptTokens + recommendation.completionTokens,
          costUsd: computeActualAiCostUsd(
            recommendation.aiModel,
            recommendation.promptTokens,
            recommendation.completionTokens,
          ),
          executionTimeMs,
        };
        if (recommendation.themeId !== 'none') {
          aiRecommendedThemeId = recommendation.themeId;
          aiRecommendationConfidence = recommendation.confidence;
        }
        this.logger.log(
          `AI recommendation received: businessId=${businessId}, themeId=${recommendation.themeId}, confidence=${recommendation.confidence}, costUsd=${aiUsage.costUsd}`,
        );
      } else if (recommendation.status === 'failed') {
        this.logger.warn(
          `AI recommendation failed: businessId=${businessId}, reason=${recommendation.reason}`,
        );
      }
    } catch (error) {
      this.logger.warn(
        `AI recommendation unavailable: businessId=${businessId}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    // Rules validate — deterministic, no AI. Every registered theme is
    // scored; only those clearing MINIMUM_COMPATIBILITY_SCORE survive.
    const ranked = rankThemes(registeredThemes, {
      industry: brandBrief.industry,
      businessCategory: business.category,
      layoutStyle: brandBrief.layoutStyle,
      websiteSections: brandBrief.websiteSections,
      aiRecommendedThemeId,
      aiRecommendationConfidence,
    });

    if (ranked.length === 0) {
      this.logger.warn(`No compatible theme found: businessId=${businessId}`);
      throw new ThemeNotFoundException();
    }

    const rankedThemesPayload = ranked.map((entry, index) => ({
      rank: index + 1,
      themeId: entry.theme.id,
      themeName: entry.theme.name,
      themeVersion: entry.theme.version,
      themeHash: entry.theme.hash,
      compatibilityScore: entry.breakdown.compositeScore,
    }));

    const recommended = ranked[0]!;
    const content = recommended.theme.content;

    const created = await this.prisma.$transaction(async (tx) => {
      const latestConfig = await tx.themeConfiguration.findFirst({
        where: { businessId },
        orderBy: { configVersion: 'desc' },
        select: { configVersion: true },
      });
      const configVersion = (latestConfig?.configVersion ?? 0) + 1;

      return tx.themeConfiguration.create({
        data: {
          businessId,
          businessAnalysisId: latestAnalysis.id,
          configVersion,

          themeId: recommended.theme.id,
          themeName: recommended.theme.name,
          themeVersion: recommended.theme.version,
          themeHash: recommended.theme.hash,
          selectedByEngineVersion: THEME_ENGINE_VERSION,
          compatibilityScore: recommended.breakdown.compositeScore,

          // Brand identity — carried through from BusinessAnalysis exactly
          // as produced by M6 (founder's D-045 rule); never regenerated.
          industry: brandBrief.industry,
          layoutStyle: brandBrief.layoutStyle,
          colorPalette: brandBrief.colorPalette as unknown as Prisma.InputJsonValue,
          typography: brandBrief.typography as unknown as Prisma.InputJsonValue,

          // Theme-owned structural output.
          componentSet: content.componentSet as unknown as Prisma.InputJsonValue,
          navigationStyle: toPrismaNavigationStyle(content.navigationStyle),
          heroStyle: toPrismaHeroStyle(content.heroStyle),
          ctaStyle: toPrismaCtaStyle(content.ctaStyle),
          cardStyle: toPrismaCardStyle(content.cardStyle),
          footerStyle: toPrismaFooterStyle(content.footerStyle),
          animationLevel: toPrismaAnimationLevel(content.animationLevel),
          imageStyle: toPrismaImageStyle(content.imageStyle),
          sectionOrder: content.sectionOrder as unknown as Prisma.InputJsonValue,
          accessibilityProfile: content.accessibilityProfile as unknown as Prisma.InputJsonValue,
          mobilePreferences: content.mobilePreferences as unknown as Prisma.InputJsonValue,
          // Module M8.1 (DECISIONS.md D-049) — copied verbatim from the
          // selected ThemeDefinition, same as every other theme-owned
          // structural field above; the Layout Generator reads it back off
          // this persisted ThemeConfiguration row, not the theme registry.
          sectionComponentMap: content.sectionComponentMap as unknown as Prisma.InputJsonValue,

          rankedThemes: rankedThemesPayload as unknown as Prisma.InputJsonValue,

          // CostService integration (D-048) — null when the AI step was
          // skipped (ceiling reached) or failed; the theme configuration
          // itself is unaffected either way.
          aiRecommendationProvider: aiUsage?.provider,
          aiRecommendationModel: aiUsage?.model,
          aiRecommendationPromptTokens: aiUsage?.promptTokens,
          aiRecommendationCompletionTokens: aiUsage?.completionTokens,
          aiRecommendationTotalTokens: aiUsage?.totalTokens,
          aiRecommendationCostUsd: aiUsage?.costUsd,
          aiRecommendationExecutionTimeMs: aiUsage?.executionTimeMs,
        },
      });
    });

    this.logger.log(
      `Theme configuration completed: businessId=${businessId}, themeId=${recommended.theme.id}, compatibilityScore=${recommended.breakdown.compositeScore}, rankedCount=${ranked.length}`,
    );

    return { configuration: toThemeConfigurationResponse(created), cacheHit: false };
  }

  private async resolveBusinessId(leadId: string): Promise<string> {
    const lead = await this.leadsService.findById(leadId);
    if (!lead) {
      throw new LeadNotFoundException();
    }
    return lead.businessId;
  }
}
