import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import {
  createSalesProposalSchema,
  listSalesProposalsQuerySchema,
  updateSalesProposalStatusSchema,
  type CreateSalesProposalInput,
  type ListSalesProposalsQuery,
  type SalesProposal,
  type UpdateSalesProposalStatusInput,
} from '@riznexia/shared-types';
import type { RequestTeamMember } from '../../auth/types/authenticated-request';
import { Audited } from '../../common/decorators/audited.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { SalesProposalService, type PaginatedSalesProposals } from './sales-proposal.service';

// /leads/:id/proposals — the Proposal Engine's per-lead surface. There is
// deliberately no DELETE and no content-editing PATCH: every "version"
// endures once created (founder's Decision 7).
@Controller('leads/:id/proposals')
export class SalesProposalController {
  constructor(private readonly salesProposalService: SalesProposalService) {}

  @Get()
  @RequirePermissions('crm:view')
  async list(
    @Param('id', ParseUUIDPipe) leadId: string,
    @Query(new ZodValidationPipe(listSalesProposalsQuerySchema)) query: ListSalesProposalsQuery,
  ): Promise<PaginatedSalesProposals> {
    return this.salesProposalService.listForLead(leadId, query);
  }

  @Get(':proposalId')
  @RequirePermissions('crm:view')
  async getById(
    @Param('id', ParseUUIDPipe) leadId: string,
    @Param('proposalId', ParseUUIDPipe) proposalId: string,
  ): Promise<SalesProposal> {
    return this.salesProposalService.findByIdOrThrow(leadId, proposalId);
  }

  @Post()
  @RequirePermissions('crm:manage')
  @Audited({ action: 'crm.proposal_created', entityType: 'SalesProposal' })
  async create(
    @Param('id', ParseUUIDPipe) leadId: string,
    @Body(new ZodValidationPipe(createSalesProposalSchema)) body: CreateSalesProposalInput,
    @CurrentUser() user: RequestTeamMember,
  ): Promise<SalesProposal> {
    return this.salesProposalService.create(leadId, body, user.id);
  }

  @Patch(':proposalId')
  @RequirePermissions('crm:manage')
  @Audited({ action: 'crm.proposal_status_updated', entityType: 'SalesProposal' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) leadId: string,
    @Param('proposalId', ParseUUIDPipe) proposalId: string,
    @Body(new ZodValidationPipe(updateSalesProposalStatusSchema))
    body: UpdateSalesProposalStatusInput,
    @CurrentUser() user: RequestTeamMember,
  ): Promise<SalesProposal> {
    return this.salesProposalService.updateStatus(leadId, proposalId, body, user.id);
  }
}
