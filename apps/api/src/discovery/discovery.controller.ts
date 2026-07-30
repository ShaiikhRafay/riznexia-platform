import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  createDiscoveryJobSchema,
  type CreateDiscoveryJobInput,
  type DiscoveryJob,
} from '@riznexia/shared-types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { RequestTeamMember } from '../auth/types/authenticated-request';
import { DiscoveryService } from './discovery.service';

// POST/GET /discovery-jobs — docs/19-api-architecture.md §5. Permission-gated
// as of Module M3 (DECISIONS.md D-023): `discovery:run` is withheld from
// Viewer and Developer (this endpoint spends real Places API budget),
// `discovery:read` is the read-only floor every other role has.
@Controller('discovery-jobs')
export class DiscoveryController {
  constructor(private readonly discoveryService: DiscoveryService) {}

  @Post()
  @RequirePermissions('discovery:run')
  // Stricter than the global 100/min default (RateLimitModule) — this is
  // the module's cost-bearing endpoint (audit finding #4); CostService is
  // the dollar-based backstop, this is the request-rate backstop for the
  // same endpoint.
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async create(
    @Body(new ZodValidationPipe(createDiscoveryJobSchema)) body: CreateDiscoveryJobInput,
    @CurrentUser() user: RequestTeamMember,
  ): Promise<DiscoveryJob[]> {
    return this.discoveryService.createJobs(body, user.id);
  }

  @Get()
  @RequirePermissions('discovery:read')
  async list(): Promise<DiscoveryJob[]> {
    return this.discoveryService.findMany();
  }

  @Get(':id')
  @RequirePermissions('discovery:read')
  async getById(@Param('id', ParseUUIDPipe) id: string): Promise<DiscoveryJob> {
    return this.discoveryService.findById(id);
  }
}
