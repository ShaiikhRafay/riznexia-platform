import { Controller, Get, HttpStatus, Param, ParseUUIDPipe, Post, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import type { ComponentManifest } from '@riznexia/shared-types';
import { Audited } from '../common/decorators/audited.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { ComponentGenerationService } from './component-generation.service';

// GET/POST /leads/:id/components — Doc 21 M8 entry (M8.2 phase), mirroring
// M8.1's GET/POST /leads/:id/layout route shape. component:generate
// (D-055+) is a dedicated permission, same rationale as layout:generate's
// own dedication from theme:select.
@Controller('leads/:id/components')
export class ComponentGenerationController {
  constructor(private readonly componentGenerationService: ComponentGenerationService) {}

  @Get()
  @RequirePermissions('leads:read')
  async getLatest(@Param('id', ParseUUIDPipe) leadId: string): Promise<ComponentManifest | null> {
    return this.componentGenerationService.findLatestForLead(leadId);
  }

  @Post()
  @RequirePermissions('component:generate')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Audited({ action: 'components.generated', entityType: 'Lead', entityIdParam: 'id' })
  async generate(
    @Param('id', ParseUUIDPipe) leadId: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ComponentManifest> {
    const { configuration, cacheHit } =
      await this.componentGenerationService.generateComponentManifestForLead(leadId);
    // Same synchronous-completion status convention as M7/M8.1's POST — a
    // cache hit returns the existing manifest (200), a cache miss just ran
    // generateComponentManifest() and persisted a new one (201).
    res.status(cacheHit ? HttpStatus.OK : HttpStatus.CREATED);
    return configuration;
  }
}
