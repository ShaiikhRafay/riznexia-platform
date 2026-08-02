import { Controller, Get, HttpStatus, Param, ParseUUIDPipe, Post, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import type { GeneratedWebsite } from '@riznexia/shared-types';
import { Audited } from '../common/decorators/audited.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { WebsiteAssemblyService } from './website-assembly.service';

// GET/POST /leads/:id/website — Doc 21 M8 entry (M8.4 phase), mirroring
// M8.3's GET/POST /leads/:id/content route shape. website:assemble
// (D-068+) is a dedicated permission, same rationale as content:bind's own
// dedication from component:generate.
@Controller('leads/:id/website')
export class WebsiteAssemblyController {
  constructor(private readonly websiteAssemblyService: WebsiteAssemblyService) {}

  @Get()
  @RequirePermissions('leads:read')
  async getLatest(@Param('id', ParseUUIDPipe) leadId: string): Promise<GeneratedWebsite | null> {
    return this.websiteAssemblyService.findLatestForLead(leadId);
  }

  @Post()
  @RequirePermissions('website:assemble')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Audited({ action: 'website.assembled', entityType: 'Lead', entityIdParam: 'id' })
  async assemble(
    @Param('id', ParseUUIDPipe) leadId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<GeneratedWebsite> {
    const { website, cacheHit } = await this.websiteAssemblyService.assembleWebsiteForLead(leadId);
    // Same synchronous-completion status convention as M7/M8.1-M8.3's POST
    // — a cache hit returns the existing project (200), a cache miss just
    // ran assembleWebsite() and persisted a new one (201).
    res.status(cacheHit ? HttpStatus.OK : HttpStatus.CREATED);
    return website;
  }
}
