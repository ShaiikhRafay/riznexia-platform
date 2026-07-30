import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  createPlaceSyncJobSchema,
  type CreatePlaceSyncJobInput,
  type PlaceSyncJob,
} from '@riznexia/shared-types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { RequestTeamMember } from '../auth/types/authenticated-request';
import { PlaceSyncService } from './place-sync.service';

// POST/GET /place-sync-jobs — Doc 21 M5 entry. Reuses Module M3's
// `discovery:run`/`discovery:read` permissions rather than inventing new
// ones (M5's own scoping decision, not part of the original M3 matrix) —
// this endpoint spends the same real Places API budget as
// POST /discovery-jobs, so the same "withheld from Viewer/Developer" floor
// applies.
@Controller('place-sync-jobs')
export class PlaceSyncController {
  constructor(private readonly placeSyncService: PlaceSyncService) {}

  @Post()
  @RequirePermissions('discovery:run')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async create(
    @Body(new ZodValidationPipe(createPlaceSyncJobSchema)) body: CreatePlaceSyncJobInput,
    @CurrentUser() user: RequestTeamMember,
  ): Promise<PlaceSyncJob> {
    return this.placeSyncService.createJob(body, user.id);
  }

  @Get()
  @RequirePermissions('discovery:read')
  async list(): Promise<PlaceSyncJob[]> {
    return this.placeSyncService.findMany();
  }

  @Get(':id')
  @RequirePermissions('discovery:read')
  async getById(@Param('id', ParseUUIDPipe) id: string): Promise<PlaceSyncJob> {
    return this.placeSyncService.findById(id);
  }
}
