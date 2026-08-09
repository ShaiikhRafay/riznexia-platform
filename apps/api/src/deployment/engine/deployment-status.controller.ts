import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import type { DeploymentStatusSnapshot } from '@riznexia/shared-types';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { DeploymentStatusService } from './deployment-status.service';

@Controller('leads/:id/deployment-status')
export class DeploymentStatusController {
  constructor(private readonly deploymentStatusService: DeploymentStatusService) {}

  @Get()
  @RequirePermissions('deployment:view')
  async get(@Param('id', ParseUUIDPipe) leadId: string): Promise<DeploymentStatusSnapshot> {
    return this.deploymentStatusService.getForLead(leadId);
  }
}
