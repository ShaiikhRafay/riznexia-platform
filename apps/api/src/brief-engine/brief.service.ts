import { Inject, Injectable } from '@nestjs/common';
import type { PrismaClient } from '@riznexia/db';
import { generateBrief } from '@riznexia/website-generator';
import type { GeneratedBrief } from '@riznexia/website-generator';
import type { BusinessAnalysisOutput } from '@riznexia/shared-types';
import { BusinessService } from '../business/business.service';
import { LeadsService } from '../leads/leads.service';
import { PRISMA_CLIENT } from '../common/database/database.constants';
import {
  BusinessAnalysisNotFoundException,
  BusinessNotFoundException,
  LeadNotFoundException,
  ThemeConfigurationNotFoundException,
} from '../common/exceptions/app.exception';
import { toBusinessContactInfo } from '../content-engine/dto/business-contact-info.mapper';
import { toThemeConfigurationResponse } from '../theme-engine/dto/theme-configuration-response.dto';

// BRIEF.md hand-off — GET /leads/:id/brief. Reads the lead's latest
// ThemeConfiguration (which already pins the BusinessAnalysis it was built
// from), loads the Business, and renders the markdown brief with the pure
// generateBrief(). Read-only: nothing is persisted, so there is no cache and
// no versioning here — the brief is always a fresh function of the latest
// analysis + theme + business record. The only I/O-ish value injected is the
// generation timestamp, kept out of the pure function on purpose.
@Injectable()
export class BriefService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    private readonly leadsService: LeadsService,
    private readonly businessService: BusinessService,
  ) {}

  async generateForLead(leadId: string): Promise<GeneratedBrief> {
    const lead = await this.leadsService.findById(leadId);
    if (!lead) {
      throw new LeadNotFoundException();
    }

    // Theme selection is the last step before a brief makes sense: it needs
    // the analysis (brand identity) AND the chosen theme (design direction).
    const themeModel = await this.prisma.themeConfiguration.findFirst({
      where: { businessId: lead.businessId },
      orderBy: { configVersion: 'desc' },
    });
    if (!themeModel) {
      throw new ThemeConfigurationNotFoundException();
    }

    const [analysis, business] = await Promise.all([
      this.prisma.businessAnalysis.findUniqueOrThrow({
        where: { id: themeModel.businessAnalysisId },
      }),
      this.businessService.findById(lead.businessId),
    ]);
    if (!business) {
      throw new BusinessNotFoundException();
    }
    if (!analysis.brandBrief) {
      throw new BusinessAnalysisNotFoundException();
    }

    return generateBrief({
      brandBrief: analysis.brandBrief as unknown as BusinessAnalysisOutput,
      business: toBusinessContactInfo(business),
      themeConfiguration: toThemeConfigurationResponse(themeModel),
      generatedAt: new Date().toISOString(),
    });
  }
}
