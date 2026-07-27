import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { listLeadsQuerySchema, type Lead, type ListLeadsQuery } from '@riznexia/shared-types';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { LeadsService, type PaginatedLeads } from './leads.service';

// GET /leads, GET /leads/{id} — docs/19-api-architecture.md §5.
// Read-only in this module (Doc 22 §8) — PATCH/DELETE are Module M2.
@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get()
  async list(
    @Query(new ZodValidationPipe(listLeadsQuerySchema)) query: ListLeadsQuery,
  ): Promise<PaginatedLeads> {
    return this.leadsService.findMany(query);
  }

  @Get(':id')
  async getById(@Param('id') id: string): Promise<Lead> {
    const lead = await this.leadsService.findById(id);
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }
    return lead;
  }
}
