import { Controller, Get, HttpStatus, Param, ParseUUIDPipe, Post, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import type { BusinessAnalysis } from '@riznexia/shared-types';
import { Audited } from '../common/decorators/audited.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { BusinessAnalysisService } from './business-analysis.service';

// GET/POST /leads/:id/business — Doc 19 §"Businesses" / Doc 21 M6 entry.
// business:analyze (D-043) is a dedicated permission, not a reuse of
// leads:write — an AI call is real, cost-bearing spend, same rationale as
// discovery:run/place-sync's reuse of it for Places API spend.
@Controller('leads/:id/business')
export class BusinessAnalysisController {
  constructor(private readonly businessAnalysisService: BusinessAnalysisService) {}

  @Get()
  @RequirePermissions('leads:read')
  async getLatest(@Param('id', ParseUUIDPipe) leadId: string): Promise<BusinessAnalysis | null> {
    return this.businessAnalysisService.findLatestForLead(leadId);
  }

  @Post()
  @RequirePermissions('business:analyze')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Audited({ action: 'business.analysis_triggered', entityType: 'Lead', entityIdParam: 'id' })
  async trigger(
    @Param('id', ParseUUIDPipe) leadId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<BusinessAnalysis> {
    const { analysis, cacheHit } = await this.businessAnalysisService.triggerAnalysis(leadId);
    // A cache hit returns the existing analysis with no new work started
    // (200); a cache miss just created a PENDING row and dispatched the
    // runner (202 — matches Doc 19's async-trigger contract).
    res.status(cacheHit ? HttpStatus.OK : HttpStatus.ACCEPTED);
    return analysis;
  }
}
