import { Controller, Get, Query } from '@nestjs/common';
import {
  dashboardQuerySchema,
  type DashboardQuery,
  type DashboardStats,
} from '@riznexia/shared-types';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { ReportingService } from './reporting.service';

// GET /crm/dashboard — gated on the dedicated `crm:report` permission
// (founder's 4-permission list), distinct from `crm:view` — a rep who can
// see individual leads doesn't automatically see org-wide sales metrics.
@Controller('crm/dashboard')
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  @Get()
  @RequirePermissions('crm:report')
  async getDashboard(
    @Query(new ZodValidationPipe(dashboardQuerySchema)) query: DashboardQuery,
  ): Promise<DashboardStats> {
    return this.reportingService.getDashboardStats(query);
  }
}
