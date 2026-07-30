import { Controller, Get, HttpStatus, Param, ParseUUIDPipe, Post, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import type { LayoutConfiguration } from '@riznexia/shared-types';
import { Audited } from '../common/decorators/audited.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { LayoutGenerationService } from './layout-generation.service';

// GET/POST /leads/:id/layout — Doc 21 M8 entry (M8.1 phase), mirroring M7's
// GET/POST /leads/:id/theme route shape. layout:generate (D-050+) is a
// dedicated permission, not a reuse of theme:select — same rationale as
// theme:select's own dedication from business:analyze.
@Controller('leads/:id/layout')
export class LayoutGenerationController {
  constructor(private readonly layoutGenerationService: LayoutGenerationService) {}

  @Get()
  @RequirePermissions('leads:read')
  async getLatest(@Param('id', ParseUUIDPipe) leadId: string): Promise<LayoutConfiguration | null> {
    return this.layoutGenerationService.findLatestForLead(leadId);
  }

  @Post()
  @RequirePermissions('layout:generate')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Audited({ action: 'layout.generated', entityType: 'Lead', entityIdParam: 'id' })
  async generate(
    @Param('id', ParseUUIDPipe) leadId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<LayoutConfiguration> {
    const { configuration, cacheHit } =
      await this.layoutGenerationService.generateLayoutForLead(leadId);
    // Same synchronous-completion status convention as M7's POST — a cache
    // hit returns the existing configuration (200), a cache miss just ran
    // generateLayout() and persisted a new configuration (201).
    res.status(cacheHit ? HttpStatus.OK : HttpStatus.CREATED);
    return configuration;
  }
}
