import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import type { WebsiteGenerationStatus } from '@riznexia/shared-types';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { WebsiteStatusService } from './website-status.service';

// GET /leads/:id/website-status — cheap, read-only, no CRM-specific
// mutation involved, so gated like every M6-M9 GET (`leads:read`), not
// `crm:view` (founder's Decision 8 — this isn't new CRM data, it's a
// read-only view over M6-M9's existing data).
@Controller('leads/:id/website-status')
export class WebsiteStatusController {
  constructor(private readonly websiteStatusService: WebsiteStatusService) {}

  @Get()
  @RequirePermissions('leads:read')
  async get(@Param('id', ParseUUIDPipe) leadId: string): Promise<WebsiteGenerationStatus> {
    return this.websiteStatusService.getForLead(leadId);
  }
}
