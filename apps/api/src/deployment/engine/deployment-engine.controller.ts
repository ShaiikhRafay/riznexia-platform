import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import {
  createWebsiteDeploymentSchema,
  listWebsiteDeploymentsQuerySchema,
  type CreateWebsiteDeploymentInput,
  type ListWebsiteDeploymentsQuery,
  type WebsiteDeployment,
} from '@riznexia/shared-types';
import type { RequestTeamMember } from '../../auth/types/authenticated-request';
import { Audited } from '../../common/decorators/audited.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  DeploymentEngineService,
  type PaginatedWebsiteDeployments,
} from './deployment-engine.service';

// /leads/:id/deployments — the Deployment Engine's per-lead surface.
// There is no DELETE and no content-mutating PATCH: every deployment
// record endures once created (founder's explicit Decision 3).
@Controller('leads/:id/deployments')
export class DeploymentEngineController {
  constructor(private readonly deploymentEngineService: DeploymentEngineService) {}

  @Get()
  @RequirePermissions('deployment:view')
  async list(
    @Param('id', ParseUUIDPipe) leadId: string,
    @Query(new ZodValidationPipe(listWebsiteDeploymentsQuerySchema))
    query: ListWebsiteDeploymentsQuery,
  ): Promise<PaginatedWebsiteDeployments> {
    return this.deploymentEngineService.listForLead(leadId, query);
  }

  @Get(':deploymentId')
  @RequirePermissions('deployment:view')
  async getById(
    @Param('id', ParseUUIDPipe) leadId: string,
    @Param('deploymentId', ParseUUIDPipe) deploymentId: string,
  ): Promise<WebsiteDeployment> {
    return this.deploymentEngineService.findByIdOrThrow(leadId, deploymentId);
  }

  @Post()
  @RequirePermissions('deployment:create')
  @Audited({ action: 'deployment.requested', entityType: 'WebsiteDeployment' })
  async create(
    @Param('id', ParseUUIDPipe) leadId: string,
    @Body(new ZodValidationPipe(createWebsiteDeploymentSchema)) body: CreateWebsiteDeploymentInput,
    @CurrentUser() user: RequestTeamMember,
  ): Promise<WebsiteDeployment> {
    return this.deploymentEngineService.requestDeployment(leadId, body, user.id);
  }

  @Post(':deploymentId/retry')
  @RequirePermissions('deployment:create')
  @Audited({ action: 'deployment.retried', entityType: 'WebsiteDeployment' })
  async retry(
    @Param('id', ParseUUIDPipe) leadId: string,
    @Param('deploymentId', ParseUUIDPipe) deploymentId: string,
    @CurrentUser() user: RequestTeamMember,
  ): Promise<WebsiteDeployment> {
    return this.deploymentEngineService.retryDeployment(leadId, deploymentId, user.id);
  }
}
