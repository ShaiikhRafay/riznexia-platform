import { Controller, Get, Param, ParseUUIDPipe, Post, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { RequestTeamMember } from '../auth/types/authenticated-request';
import { Audited } from '../common/decorators/audited.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { BriefService } from '../brief-engine/brief.service';
import { buildPackZip } from './build-pack';
import { CustomSiteInvalidException } from './custom-site.exceptions';
import {
  CustomSiteService,
  type CustomSiteDeploymentView,
  type CustomSiteView,
} from './custom-site.service';

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

function readBody(req: Request, max: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (c: Buffer) => {
      size += c.length;
      if (size > max) {
        reject(new CustomSiteInvalidException([`Upload larger than ${max / 1024 / 1024} MB`]));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// /leads/:id/build-pack            GET   zip of BRIEF.md + CLAUDE.md + package-site.sh + START.md
// /leads/:id/custom-sites          GET   uploaded versions + their deployments (status refreshed)
// /leads/:id/custom-sites          POST  raw application/zip body (site.zip) -> validated + stored
// /leads/:id/custom-sites/:siteId/deployments POST -> deploys that version to Vercel
@Controller('leads/:id')
export class CustomSiteController {
  constructor(
    private readonly sites: CustomSiteService,
    private readonly briefService: BriefService,
  ) {}

  @Get('build-pack')
  @RequirePermissions('leads:read')
  async buildPack(@Param('id', ParseUUIDPipe) leadId: string, @Res() res: Response): Promise<void> {
    const brief = await this.briefService.generateForLead(leadId);
    const name = brief.markdown.match(/^# BRIEF — (.+)$/m)?.[1] ?? brief.slug;
    const zip = buildPackZip(brief, name);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="build-pack-${brief.slug}.zip"`);
    res.end(zip);
  }

  @Get('custom-sites')
  @RequirePermissions('deployment:view')
  async list(@Param('id', ParseUUIDPipe) leadId: string): Promise<CustomSiteView[]> {
    return this.sites.list(leadId);
  }

  @Post('custom-sites')
  @RequirePermissions('website:assemble')
  @Audited({ action: 'custom_site.uploaded', entityType: 'CustomSite' })
  async upload(
    @Param('id', ParseUUIDPipe) leadId: string,
    @Req() req: Request,
    @CurrentUser() user: RequestTeamMember,
  ): Promise<CustomSiteView> {
    const body = await readBody(req, MAX_UPLOAD_BYTES);
    return this.sites.upload(leadId, body, user.id);
  }

  @Post('custom-sites/:siteId/deployments')
  @RequirePermissions('deployment:create')
  @Audited({ action: 'custom_site.deployed', entityType: 'CustomSiteDeployment' })
  async deploy(
    @Param('id', ParseUUIDPipe) leadId: string,
    @Param('siteId', ParseUUIDPipe) siteId: string,
    @CurrentUser() user: RequestTeamMember,
  ): Promise<CustomSiteDeploymentView> {
    return this.sites.deploy(leadId, siteId, user.id);
  }
}
