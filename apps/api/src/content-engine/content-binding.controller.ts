import { Controller, Get, HttpStatus, Param, ParseUUIDPipe, Post, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import type { ContentManifest } from '@riznexia/shared-types';
import { Audited } from '../common/decorators/audited.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { ContentBindingService } from './content-binding.service';

// GET/POST /leads/:id/content — Doc 21 M8 entry (M8.3 phase), mirroring
// M8.2's GET/POST /leads/:id/components route shape. content:bind (D-061+)
// is a dedicated permission, same rationale as component:generate's own
// dedication from layout:generate.
@Controller('leads/:id/content')
export class ContentBindingController {
  constructor(private readonly contentBindingService: ContentBindingService) {}

  @Get()
  @RequirePermissions('leads:read')
  async getLatest(@Param('id', ParseUUIDPipe) leadId: string): Promise<ContentManifest | null> {
    return this.contentBindingService.findLatestForLead(leadId);
  }

  @Post()
  @RequirePermissions('content:bind')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Audited({ action: 'content.bound', entityType: 'Lead', entityIdParam: 'id' })
  async bind(
    @Param('id', ParseUUIDPipe) leadId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ContentManifest> {
    const { configuration, cacheHit } = await this.contentBindingService.bindContentForLead(leadId);
    // Same synchronous-completion status convention as M7/M8.1/M8.2's POST
    // — a cache hit returns the existing manifest (200), a cache miss just
    // ran generateContentManifest() and persisted a new one (201).
    res.status(cacheHit ? HttpStatus.OK : HttpStatus.CREATED);
    return configuration;
  }
}
