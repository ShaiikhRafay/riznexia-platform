import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  analyticsReportQuerySchema,
  reportTypeSchema,
  type AnalyticsReportEnvelope,
  type AnalyticsReportQuery,
  type ReportType,
} from '@riznexia/shared-types';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ReportingEngineService } from './reporting-engine.service';

// GET /analytics/reports/:type — the full per-report drill-down. Gated
// on `analytics:report`, distinct from (and more restricted than)
// `analytics:view`, which only reaches the rolled-up dashboard —
// individual reports (Audit, User Activity, full AI Cost breakdowns) are
// materially more detailed/sensitive than a dashboard widget summary.
@Controller('analytics/reports')
export class ReportingEngineController {
  constructor(private readonly reportingEngineService: ReportingEngineService) {}

  @Get(':type')
  @RequirePermissions('analytics:report')
  async get(
    @Param('type', new ZodValidationPipe(reportTypeSchema)) type: ReportType,
    @Query(new ZodValidationPipe(analyticsReportQuerySchema)) query: AnalyticsReportQuery,
  ): Promise<AnalyticsReportEnvelope> {
    return this.reportingEngineService.generateReport(type, query);
  }
}
