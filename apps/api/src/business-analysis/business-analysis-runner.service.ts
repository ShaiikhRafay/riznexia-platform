import { Inject, Injectable, Logger } from '@nestjs/common';
import { AnalysisStatus as PrismaAnalysisStatus } from '@riznexia/db';
import type { AiProviderName, Prisma, PrismaClient } from '@riznexia/db';
import { AiService, type AiServiceEvent, type BusinessAnalysisPromptInput } from '@riznexia/ai';
import { PRISMA_CLIENT } from '../common/database/database.constants';
import { CostService } from '../common/cost/cost.service';
import { AI_BUSINESS_ANALYSIS_ESTIMATED_COST_USD } from '../common/cost/cost.constants';
import { computeActualAiCostUsd } from '../common/cost/ai-cost.util';

// Truncation bound for rawResponse on a FAILED analysis (Req 5) — bounds
// storage on a pathological response without losing the diagnostic value
// of "what did the model actually say".
const RAW_RESPONSE_MAX_CHARS = 65_536;

// Module M6's sync engine — the BusinessAnalysis equivalent of M5's
// PlaceSyncRunnerService: owns the PENDING→COMPLETED/FAILED lifecycle for
// one row, called fire-and-forget by BusinessAnalysisService (D-004
// precedent, same as M1/M5). AiService itself is Prisma/NestJS-free
// (packages/ai must stay usable by M7/M8 without an apps/api dependency);
// this class is the only place that persists an AiAnalysisOutcome.
@Injectable()
export class BusinessAnalysisRunnerService {
  private readonly logger = new Logger(BusinessAnalysisRunnerService.name);

  constructor(
    private readonly aiService: AiService,
    private readonly costService: CostService,
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
  ) {}

  async run(analysisId: string): Promise<void> {
    const analysis = await this.prisma.businessAnalysis.findUniqueOrThrow({
      where: { id: analysisId },
      include: { business: true },
    });
    const context = {
      businessId: analysis.businessId,
      analysisId,
      analysisVersion: analysis.analysisVersion,
    };

    this.logger.log(`Analysis started: ${JSON.stringify(context)}`);

    try {
      // Reserve-then-log (CostService.charge's atomic pattern, D-010) —
      // conservative pre-flight estimate; see cost.constants.ts for why an
      // LLM call can't be charged an exact per-call figure the way a
      // Places API call is.
      await this.costService.charge(
        'ai_business_analysis',
        AI_BUSINESS_ANALYSIS_ESTIMATED_COST_USD,
        {
          businessId: analysis.businessId,
          analysisId,
        },
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Provider error: ${JSON.stringify(context)}: ${message}`);
      await this.markFailed(analysisId, [message]);
      return;
    }

    const input: BusinessAnalysisPromptInput = {
      businessName: analysis.business.businessName,
      category: analysis.business.category,
      city: analysis.business.city,
      address: analysis.business.address,
      phone: analysis.business.phone,
      rating: analysis.business.rating,
      reviewCount: analysis.business.reviewCount,
      openingHours: analysis.business.openingHours,
      photos: analysis.business.photos,
      websiteStatus: analysis.business.websiteStatus,
      googleBusinessUrl: analysis.business.googleBusinessUrl,
      placesData: analysis.business.placesData,
    };

    let outcome;
    try {
      outcome = await this.aiService.analyzeBusiness(input, {
        onEvent: (event) => this.logEvent(context, event),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Provider error: ${JSON.stringify(context)}: ${message}`);
      await this.markFailed(analysisId, [message]);
      return;
    }

    const estimatedCost = computeActualAiCostUsd(
      outcome.aiModel,
      outcome.promptTokens,
      outcome.completionTokens,
    );

    if (outcome.status === 'completed') {
      await this.prisma.businessAnalysis.update({
        where: { id: analysisId },
        data: {
          status: PrismaAnalysisStatus.COMPLETED,
          brandBrief: outcome.brandBrief as unknown as Prisma.InputJsonValue,
          confidenceScore: outcome.confidenceScore,
          aiProvider: outcome.aiProvider as AiProviderName,
          aiModel: outcome.aiModel,
          promptTokens: outcome.promptTokens,
          completionTokens: outcome.completionTokens,
          totalTokens: outcome.totalTokens,
          estimatedCost,
          executionTimeMs: outcome.executionTimeMs,
          completedAt: new Date(),
        },
      });
      this.logger.log(
        `Analysis completed: ${JSON.stringify({ ...context, aiModel: outcome.aiModel, totalTokens: outcome.totalTokens, estimatedCost, executionTimeMs: outcome.executionTimeMs })}`,
      );
      return;
    }

    // Req 5 — never persist invalid structured data: brandBrief stays
    // null, the raw text and validation errors are stored instead so a
    // prompt-quality regression is diagnosable.
    await this.prisma.businessAnalysis.update({
      where: { id: analysisId },
      data: {
        status: PrismaAnalysisStatus.FAILED,
        rawResponse: outcome.rawResponse.slice(0, RAW_RESPONSE_MAX_CHARS),
        validationErrors: outcome.validationErrors as unknown as Prisma.InputJsonValue,
        aiProvider: outcome.aiProvider as AiProviderName,
        aiModel: outcome.aiModel,
        promptTokens: outcome.promptTokens,
        completionTokens: outcome.completionTokens,
        totalTokens: outcome.totalTokens,
        estimatedCost,
        executionTimeMs: outcome.executionTimeMs,
        completedAt: new Date(),
      },
    });
    this.logger.error(
      `Analysis failed: ${JSON.stringify({ ...context, validationErrors: outcome.validationErrors })}`,
    );
  }

  private logEvent(
    context: { businessId: string; analysisId: string; analysisVersion: number },
    event: AiServiceEvent,
  ): void {
    switch (event.type) {
      case 'retry_attempt':
        this.logger.log(`Retry attempt: ${JSON.stringify({ ...context, ...event })}`);
        break;
      case 'repair_prompt_sent':
        this.logger.log(`Repair prompt sent: ${JSON.stringify({ ...context, ...event })}`);
        break;
      case 'validation_failure':
        this.logger.warn(`Validation failure: ${JSON.stringify({ ...context, ...event })}`);
        break;
      case 'provider_error':
        this.logger.error(`Provider error: ${JSON.stringify({ ...context, ...event })}`);
        break;
    }
  }

  private async markFailed(analysisId: string, errors: string[]): Promise<void> {
    await this.prisma.businessAnalysis
      .update({
        where: { id: analysisId },
        data: {
          status: PrismaAnalysisStatus.FAILED,
          validationErrors: errors as unknown as Prisma.InputJsonValue,
          completedAt: new Date(),
        },
      })
      .catch(() => {
        // best-effort — if even this write fails, the row is stuck PENDING
        // and needs manual/ops attention, not a retry loop here (same
        // precedent as PlaceSyncRunnerService's terminal catch).
      });
  }
}
