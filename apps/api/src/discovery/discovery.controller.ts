import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import {
  createDiscoveryJobSchema,
  type CreateDiscoveryJobInput,
  type DiscoveryJob,
} from '@riznexia/shared-types';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import type { RequestTeamMember } from '../auth/types/authenticated-request';
import { DiscoveryService } from './discovery.service';

// POST/GET /discovery-jobs — docs/19-api-architecture.md §5.
@Controller('discovery-jobs')
export class DiscoveryController {
  constructor(private readonly discoveryService: DiscoveryService) {}

  @Post()
  async create(
    @Body(new ZodValidationPipe(createDiscoveryJobSchema)) body: CreateDiscoveryJobInput,
    @CurrentUser() user: RequestTeamMember,
  ): Promise<DiscoveryJob[]> {
    return this.discoveryService.createJobs(body, user.id);
  }

  @Get()
  async list(): Promise<DiscoveryJob[]> {
    return this.discoveryService.findMany();
  }

  @Get(':id')
  async getById(@Param('id') id: string): Promise<DiscoveryJob> {
    return this.discoveryService.findById(id);
  }
}
