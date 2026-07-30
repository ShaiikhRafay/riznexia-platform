import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  createLeadNoteSchema,
  createLeadSchema,
  listLeadSubResourceQuerySchema,
  listLeadsQuerySchema,
  updateLeadSchema,
  type CreateLeadInput,
  type CreateLeadNoteInput,
  type Lead,
  type LeadNote,
  type ListLeadSubResourceQuery,
  type ListLeadsQuery,
  type UpdateLeadInput,
} from '@riznexia/shared-types';
import type { RequestTeamMember } from '../auth/types/authenticated-request';
import { Audited } from '../common/decorators/audited.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { LeadActivityService, type PaginatedLeadActivity } from './lead-activity.service';
import { LeadNotesService, type PaginatedLeadNotes } from './lead-notes.service';
import { LeadsService, type PaginatedLeads } from './leads.service';

// /leads — docs/19-api-architecture.md §5. Module M4 (Lead Management APIs,
// DECISIONS.md D-030) adds CRUD/workflow/notes/activity on top of Module
// M1's read-only GET routes. Class-level `leads:read` is the floor; write
// routes override to the specific permission they need (Module M3).
@Controller('leads')
@RequirePermissions('leads:read')
export class LeadsController {
  constructor(
    private readonly leadsService: LeadsService,
    private readonly leadNotesService: LeadNotesService,
    private readonly leadActivityService: LeadActivityService,
  ) {}

  @Get()
  async list(
    @Query(new ZodValidationPipe(listLeadsQuerySchema)) query: ListLeadsQuery,
  ): Promise<PaginatedLeads> {
    return this.leadsService.findMany(query);
  }

  @Get(':id')
  async getById(@Param('id', ParseUUIDPipe) id: string): Promise<Lead> {
    const lead = await this.leadsService.findById(id);
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }
    return lead;
  }

  @Post()
  @RequirePermissions('leads:write')
  @Audited({ action: 'lead.created', entityType: 'Lead' })
  async create(
    @Body(new ZodValidationPipe(createLeadSchema)) body: CreateLeadInput,
    @CurrentUser() user: RequestTeamMember,
  ): Promise<Lead> {
    return this.leadsService.create(body, user.id);
  }

  @Patch(':id')
  @RequirePermissions('leads:write')
  @Audited({ action: 'lead.updated', entityType: 'Lead' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(updateLeadSchema)) body: UpdateLeadInput,
    @CurrentUser() user: RequestTeamMember,
  ): Promise<Lead> {
    return this.leadsService.update(id, body, user.id);
  }

  @Delete(':id')
  @RequirePermissions('leads:delete')
  @Audited({ action: 'lead.deleted', entityType: 'Lead' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async softDelete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: RequestTeamMember,
  ): Promise<void> {
    await this.leadsService.softDelete(id, user.id);
  }

  @Post(':id/notes')
  @RequirePermissions('leads:write')
  @Audited({ action: 'lead.note_added', entityType: 'Lead' })
  async addNote(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(createLeadNoteSchema)) body: CreateLeadNoteInput,
    @CurrentUser() user: RequestTeamMember,
  ): Promise<LeadNote> {
    return this.leadNotesService.create(id, body.body, user.id);
  }

  @Get(':id/notes')
  async listNotes(
    @Param('id', ParseUUIDPipe) id: string,
    @Query(new ZodValidationPipe(listLeadSubResourceQuerySchema)) query: ListLeadSubResourceQuery,
  ): Promise<PaginatedLeadNotes> {
    return this.leadNotesService.listForLead(id, query);
  }

  @Get(':id/activity')
  async listActivity(
    @Param('id', ParseUUIDPipe) id: string,
    @Query(new ZodValidationPipe(listLeadSubResourceQuerySchema)) query: ListLeadSubResourceQuery,
  ): Promise<PaginatedLeadActivity> {
    return this.leadActivityService.listForLead(id, query);
  }
}
