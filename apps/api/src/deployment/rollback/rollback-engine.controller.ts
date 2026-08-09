import { Controller, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import type { WebsiteDeployment } from '@riznexia/shared-types';
import type { RequestTeamMember } from '../../auth/types/authenticated-request';
import { Audited } from '../../common/decorators/audited.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { RollbackEngineService } from './rollback-engine.service';

// POST /leads/:id/deployments/:deploymentId/rollback — rolls back TO the
// deployment named in the URL (which must be a previous COMPLETED +
// HEALTHY one). A separate, dedicated permission from `deployment:create`
// — rolling production back is a materially different blast radius than
// deploying forward.
@Controller('leads/:id/deployments/:deploymentId')
export class RollbackEngineController {
  constructor(private readonly rollbackEngineService: RollbackEngineService) {}

  @Post('rollback')
  @RequirePermissions('deployment:rollback')
  @Audited({
    action: 'deployment.rollback',
    entityType: 'WebsiteDeployment',
    entityIdParam: 'deploymentId',
  })
  async rollback(
    @Param('id', ParseUUIDPipe) leadId: string,
    @Param('deploymentId', ParseUUIDPipe) deploymentId: string,
    @CurrentUser() user: RequestTeamMember,
  ): Promise<WebsiteDeployment> {
    return this.rollbackEngineService.rollbackTo(leadId, deploymentId, user.id);
  }
}
