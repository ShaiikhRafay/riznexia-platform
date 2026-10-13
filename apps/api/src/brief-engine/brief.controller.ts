import { Controller, Get, Param, ParseUUIDPipe, Res } from '@nestjs/common';
import type { Response } from 'express';
import type { GeneratedBrief } from '@riznexia/website-generator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { BriefService } from './brief.service';

// GET /leads/:id/brief          -> { markdown, slug, filePath, dataGaps }
// GET /leads/:id/brief/download -> the BRIEF.md file itself (attachment)
//
// leads:read, like every other read-only view of a lead's generation
// artifacts: the brief only restates data the rep can already see.
@Controller('leads/:id/brief')
export class BriefController {
  constructor(private readonly briefService: BriefService) {}

  @Get()
  @RequirePermissions('leads:read')
  async getBrief(@Param('id', ParseUUIDPipe) leadId: string): Promise<GeneratedBrief> {
    return this.briefService.generateForLead(leadId);
  }

  @Get('download')
  @RequirePermissions('leads:read')
  async download(
    @Param('id', ParseUUIDPipe) leadId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<string> {
    const brief = await this.briefService.generateForLead(leadId);
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="BRIEF-${brief.slug}.md"`);
    return brief.markdown;
  }
}
