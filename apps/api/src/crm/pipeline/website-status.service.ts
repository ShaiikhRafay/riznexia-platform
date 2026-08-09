import { Inject, Injectable } from '@nestjs/common';
import { AnalysisStatus, type PrismaClient } from '@riznexia/db';
import type { WebsiteGenerationStage, WebsiteGenerationStatus } from '@riznexia/shared-types';
import { PRISMA_CLIENT } from '../../common/database/database.constants';
import { LeadNotFoundException } from '../../common/exceptions/app.exception';

// Module M10 (DECISIONS.md D-088) — founder's explicit Decision 8:
// computed, never persisted, never duplicating M6-M9 data. A handful of
// cheap existence checks against the already-persisted M6-M9 artifacts
// for this lead's business — no new storage, nothing to keep in sync.
// A different concept from `Business.websiteStatus` (M1/M5 — whether
// this prospect already has a website of their own); see
// `packages/shared-types/src/website-status.ts`'s own doc comment.
const STAGE_SEQUENCE: WebsiteGenerationStage[] = [
  'not_started',
  'analyzed',
  'theme_selected',
  'layout_generated',
  'components_generated',
  'content_bound',
  'generated',
  'preview_ready',
];

@Injectable()
export class WebsiteStatusService {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  async getForLead(leadId: string): Promise<WebsiteGenerationStatus> {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId, business: { deletedAt: null } },
      select: { businessId: true },
    });
    if (!lead) {
      throw new LeadNotFoundException();
    }
    const businessId = lead.businessId;

    const [analysis, theme, layout, components, content, generatedWebsite, preview, readiness] =
      await Promise.all([
        this.prisma.businessAnalysis.findFirst({
          where: { businessId, status: AnalysisStatus.COMPLETED },
          select: { id: true },
        }),
        this.prisma.themeConfiguration.findFirst({ where: { businessId }, select: { id: true } }),
        this.prisma.layoutConfiguration.findFirst({ where: { businessId }, select: { id: true } }),
        this.prisma.componentManifest.findFirst({ where: { businessId }, select: { id: true } }),
        this.prisma.contentManifest.findFirst({ where: { businessId }, select: { id: true } }),
        this.prisma.generatedWebsite.findFirst({
          where: { businessId },
          orderBy: { configVersion: 'desc' },
          select: { configVersion: true },
        }),
        this.prisma.websitePreview.findFirst({ where: { businessId }, select: { id: true } }),
        this.prisma.publishReadinessReport.findFirst({
          where: { businessId },
          orderBy: { previewVersion: 'desc' },
          select: { overallPublishScore: true },
        }),
      ]);

    const has = {
      hasAnalysis: !!analysis,
      hasTheme: !!theme,
      hasLayout: !!layout,
      hasComponents: !!components,
      hasContent: !!content,
      hasGeneratedWebsite: !!generatedWebsite,
      hasPreview: !!preview,
    };

    const milestones = [
      has.hasAnalysis,
      has.hasTheme,
      has.hasLayout,
      has.hasComponents,
      has.hasContent,
      has.hasGeneratedWebsite,
      has.hasPreview,
    ];
    // The furthest milestone reached in the fixed pipeline order — a
    // deterministic fold, not a guess: index 0 of STAGE_SEQUENCE is
    // 'not_started', so milestone[i] being true means stage index i+1
    // was reached.
    let stageIndex = 0;
    for (const reached of milestones) {
      if (!reached) break;
      stageIndex += 1;
    }

    const overallScore = readiness?.overallPublishScore as unknown as { score: number } | null;

    return {
      leadId,
      stage: STAGE_SEQUENCE[stageIndex] ?? 'not_started',
      ...has,
      generatedWebsiteVersion: generatedWebsite?.configVersion ?? null,
      publishReadinessScore: overallScore?.score ?? null,
    };
  }
}
