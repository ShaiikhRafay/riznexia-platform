import { Controller, Get, Query } from '@nestjs/common';
import {
  analyticsDashboardQuerySchema,
  type AnalyticsDashboard,
  type AnalyticsDashboardQuery,
} from '@riznexia/shared-types';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { DashboardEngineService } from './dashboard-engine.service';

// GET /analytics/dashboard — the composed, rolled-up live view. Gated on
// `analytics:view` (the broader-audience permission — developer/viewer
// hold it too) since a widget summary is materially less sensitive than
// the full per-report drill-down `GET /analytics/reports/:type` exposes
// (gated `analytics:report`).
@Controller('analytics/dashboard')
export class DashboardEngineController {
  constructor(private readonly dashboardEngineService: DashboardEngineService) {}

  @Get()
  @RequirePermissions('analytics:view')
  async get(
    @Query(new ZodValidationPipe(analyticsDashboardQuerySchema)) query: AnalyticsDashboardQuery,
  ): Promise<AnalyticsDashboard> {
    return this.dashboardEngineService.getDashboard(query);
  }
}
