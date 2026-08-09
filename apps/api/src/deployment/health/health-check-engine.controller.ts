import { Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import {
  listDeploymentHealthChecksQuerySchema,
  type DeploymentHealthCheck,
  type ListDeploymentHealthChecksQuery,
} from '@riznexia/shared-types';
import { Audited } from '../../common/decorators/audited.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  HealthCheckEngineService,
  type PaginatedDeploymentHealthChecks,
} from './health-check-engine.service';

// /leads/:id/deployments/:deploymentId/health[...] — the Health Check
// Engine's per-deployment surface.
@Controller('leads/:id/deployments/:deploymentId')
export class HealthCheckEngineController {
  constructor(private readonly healthCheckEngineService: HealthCheckEngineService) {}

  @Get('health')
  @RequirePermissions('deployment:view')
  async list(
    @Param('id', ParseUUIDPipe) leadId: string,
    @Param('deploymentId', ParseUUIDPipe) deploymentId: string,
    @Query(new ZodValidationPipe(listDeploymentHealthChecksQuerySchema))
    query: ListDeploymentHealthChecksQuery,
  ): Promise<PaginatedDeploymentHealthChecks> {
    return this.healthCheckEngineService.listForDeployment(leadId, deploymentId, query);
  }

  @Post('health-check')
  @RequirePermissions('deployment:manage')
  @Audited({
    action: 'deployment.health_check_triggered',
    entityType: 'WebsiteDeployment',
    entityIdParam: 'deploymentId',
  })
  async trigger(
    @Param('id', ParseUUIDPipe) leadId: string,
    @Param('deploymentId', ParseUUIDPipe) deploymentId: string,
  ): Promise<DeploymentHealthCheck> {
    return this.healthCheckEngineService.triggerManualCheck(leadId, deploymentId);
  }
}
