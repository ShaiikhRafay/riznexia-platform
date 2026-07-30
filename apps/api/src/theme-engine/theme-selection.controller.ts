import { Controller, Get, HttpStatus, Param, ParseUUIDPipe, Post, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import type { ThemeConfiguration } from '@riznexia/shared-types';
import { Audited } from '../common/decorators/audited.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { ThemeSelectionService } from './theme-selection.service';

// GET/POST /leads/:id/theme — Doc 21 M7 entry, mirroring M6's
// GET/POST /leads/:id/business route shape. theme:select (D-047) is a
// dedicated permission, not a reuse of business:analyze — theme selection
// is its own cost-bearing, independently-assignable capability (premium
// themes / marketplace / manual override / approval workflow are all
// named future extensions of this specific capability).
@Controller('leads/:id/theme')
export class ThemeSelectionController {
  constructor(private readonly themeSelectionService: ThemeSelectionService) {}

  @Get()
  @RequirePermissions('leads:read')
  async getLatest(@Param('id', ParseUUIDPipe) leadId: string): Promise<ThemeConfiguration | null> {
    return this.themeSelectionService.findLatestForLead(leadId);
  }

  @Post()
  @RequirePermissions('theme:select')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Audited({ action: 'theme.selected', entityType: 'Lead', entityIdParam: 'id' })
  async select(
    @Param('id', ParseUUIDPipe) leadId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ThemeConfiguration> {
    const { configuration, cacheHit } = await this.themeSelectionService.selectTheme(leadId);
    // A cache hit returns the existing configuration with no new selection
    // run (200); a cache miss just ran the full AI-recommends/rules-rank
    // flow and persisted a new configuration (201 — unlike M6's POST,
    // this one completes synchronously, so 201 Created is the correct
    // status rather than 202 Accepted).
    res.status(cacheHit ? HttpStatus.OK : HttpStatus.CREATED);
    return configuration;
  }
}
