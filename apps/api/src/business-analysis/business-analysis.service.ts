import { Inject, Injectable, Logger } from '@nestjs/common';
import { AiProviderName, AnalysisStatus as PrismaAnalysisStatus } from '@riznexia/db';
import type { PrismaClient } from '@riznexia/db';
import { PromptRegistry, STANDARD_MODEL, type BusinessAnalysisPromptInput } from '@riznexia/ai';
import type { BusinessAnalysis as BusinessAnalysisResponse } from '@riznexia/shared-types';
import { BusinessService } from '../business/business.service';
import { LeadsService } from '../leads/leads.service';
import { PRISMA_CLIENT } from '../common/database/database.constants';
import {
  BusinessNotFoundException,
  LeadNotFoundException,
} from '../common/exceptions/app.exception';
import { computeBusinessFingerprint } from './business-fingerprint';
import { toBusinessAnalysisResponse } from './dto/business-analysis-response.dto';
import { BusinessAnalysisRunnerService } from './business-analysis-runner.service';

export interface TriggerAnalysisResult {
  analysis: BusinessAnalysisResponse;
  cacheHit: boolean;
}

// Module M6 — POST /leads/:id/business orchestration, mirroring
// PlaceSyncService's split (this service owns the cache check, job row,
// and dispatch; BusinessAnalysisRunnerService owns the actual AI call and
// persistence), same rationale as Doc 22 §5/§8 for M1/M5.
@Injectable()
export class BusinessAnalysisService {
  private readonly logger = new Logger(BusinessAnalysisService.name);
  private readonly promptRegistry = new PromptRegistry();

  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    private readonly leadsService: LeadsService,
    private readonly businessService: BusinessService,
    private readonly runner: BusinessAnalysisRunnerService,
  ) {}

  /**
   * GET /leads/:id/business — the latest analysis for this lead's
   * business, or null if none has ever been triggered. A missing analysis
   * is not an error state for an otherwise-valid lead.
   */
  async findLatestForLead(leadId: string): Promise<BusinessAnalysisResponse | null> {
    const businessId = await this.resolveBusinessId(leadId);
    const latest = await this.prisma.businessAnalysis.findFirst({
      where: { businessId },
      orderBy: { analysisVersion: 'desc' },
    });
    return latest ? toBusinessAnalysisResponse(latest) : null;
  }

  /**
   * POST /leads/:id/business — the AI result cache (Implementation
   * Rules): compare the business's current fingerprint against the
   * latest COMPLETED analysis's inputHash. A match returns the cached
   * analysis (200, no AI call, "Cache Hit" logged); a miss creates a new
   * PENDING row, dispatches the runner fire-and-forget (D-004 precedent),
   * and returns it immediately (202, "Cache Miss" logged).
   */
  async triggerAnalysis(leadId: string): Promise<TriggerAnalysisResult> {
    const businessId = await this.resolveBusinessId(leadId);
    const business = await this.businessService.findById(businessId);
    if (!business) {
      throw new BusinessNotFoundException();
    }

    const inputHash = computeBusinessFingerprint(business);

    const latestCompleted = await this.prisma.businessAnalysis.findFirst({
      where: { businessId, status: PrismaAnalysisStatus.COMPLETED },
      orderBy: { analysisVersion: 'desc' },
    });

    if (latestCompleted && latestCompleted.inputHash === inputHash) {
      this.logger.log(`Cache hit: businessId=${businessId}, analysisId=${latestCompleted.id}`);
      return { analysis: toBusinessAnalysisResponse(latestCompleted), cacheHit: true };
    }

    this.logger.log(`Cache miss: businessId=${businessId}`);

    const promptInput: BusinessAnalysisPromptInput = {
      businessName: business.businessName,
      category: business.category,
      city: business.city,
      address: business.address,
      phone: business.phone,
      rating: business.rating,
      reviewCount: business.reviewCount,
      openingHours: business.openingHours,
      photos: business.photos,
      websiteStatus: business.websiteStatus,
      googleBusinessUrl: business.googleBusinessUrl,
      placesData: business.placesData,
    };
    // Resolving the prompt here is a pure, local operation (no network
    // call) — it lets the PENDING row carry the exact promptName/
    // promptVersion/promptHash that will produce it before the AI call
    // has even started (Req 1/3: every analysis records which template
    // produced it).
    const resolvedPrompt = this.promptRegistry.resolveBusinessAnalysis(promptInput);

    const created = await this.prisma.$transaction(async (tx) => {
      const latestAny = await tx.businessAnalysis.findFirst({
        where: { businessId },
        orderBy: { analysisVersion: 'desc' },
        select: { analysisVersion: true },
      });
      const analysisVersion = (latestAny?.analysisVersion ?? 0) + 1;

      return tx.businessAnalysis.create({
        data: {
          businessId,
          analysisVersion,
          promptName: resolvedPrompt.promptName,
          promptVersion: resolvedPrompt.promptVersion,
          promptHash: resolvedPrompt.promptHash,
          // Initial placeholder — the runner overwrites this with whichever
          // model actually produced the final result (standard tier or the
          // Doc 20 escalation tier) once the run completes.
          aiProvider: AiProviderName.CLAUDE,
          aiModel: STANDARD_MODEL,
          inputHash,
          status: PrismaAnalysisStatus.PENDING,
        },
      });
    });

    // DECISIONS.md D-004: in-process dispatch pending real Trigger.dev
    // wiring, same fire-and-forget pattern as DiscoveryService/
    // PlaceSyncService — the HTTP response doesn't block on completion.
    void this.runner.run(created.id).catch((error: unknown) => {
      this.logger.error(`Unhandled error running business analysis ${created.id}`, error);
    });

    return { analysis: toBusinessAnalysisResponse(created), cacheHit: false };
  }

  private async resolveBusinessId(leadId: string): Promise<string> {
    const lead = await this.leadsService.findById(leadId);
    if (!lead) {
      throw new LeadNotFoundException();
    }
    return lead.businessId;
  }
}
