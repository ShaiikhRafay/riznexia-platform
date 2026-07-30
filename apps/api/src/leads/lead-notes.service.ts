import { Inject, Injectable, Logger } from '@nestjs/common';
import { LeadActivityType as PrismaLeadActivityType } from '@riznexia/db';
import type { PrismaClient } from '@riznexia/db';
import type { LeadNote, ListLeadSubResourceQuery } from '@riznexia/shared-types';
import { PRISMA_CLIENT } from '../common/database/database.constants';
import { LeadNotFoundException } from '../common/exceptions/app.exception';
import { toLeadNoteResponse } from './dto/lead-sub-resource.dto';
import { LeadActivityService } from './lead-activity.service';

export interface PaginatedLeadNotes {
  items: LeadNote[];
  nextCursor: string | null;
}

// Doc 16 §3 — Pipeline Context. Append-only internal notes on a lead
// (DECISIONS.md D-030). There is deliberately no update or delete path:
// editing away what a rep recorded defeats the purpose of the record.
@Injectable()
export class LeadNotesService {
  private readonly logger = new Logger(LeadNotesService.name);

  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    private readonly activityService: LeadActivityService,
  ) {}

  /**
   * The note and its timeline entry are written in one transaction — a note
   * that exists without a corresponding `note_added` activity would leave
   * the lead's history quietly incomplete.
   */
  async create(leadId: string, body: string, authorId: string): Promise<LeadNote> {
    await this.assertLeadExists(leadId);

    const note = await this.prisma.$transaction(async (tx) => {
      const created = await tx.leadNote.create({
        data: { leadId, body, authorId },
      });

      await this.activityService.record(
        {
          leadId,
          actorId: authorId,
          type: PrismaLeadActivityType.NOTE_ADDED,
          detail: { noteId: created.id },
        },
        tx,
      );

      return created;
    });

    this.logger.log(`Note ${note.id} added to lead ${leadId} by ${authorId}`);
    return toLeadNoteResponse(note);
  }

  async listForLead(leadId: string, query: ListLeadSubResourceQuery): Promise<PaginatedLeadNotes> {
    await this.assertLeadExists(leadId);

    const rows = await this.prisma.leadNote.findMany({
      where: { leadId },
      take: query.limit + 1,
      ...(query.cursor && { cursor: { id: query.cursor }, skip: 1 }),
      // Newest first; `id` tiebreaks so the cursor is stable for notes
      // sharing a timestamp.
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });

    const hasMore = rows.length > query.limit;
    const page = hasMore ? rows.slice(0, query.limit) : rows;
    const last = page.at(-1);

    return {
      items: page.map(toLeadNoteResponse),
      nextCursor: hasMore && last ? last.id : null,
    };
  }

  /**
   * Notes hang off a lead, so an unknown (or soft-deleted) lead is a 404 on
   * the lead — not an empty note list, which would wrongly imply the lead
   * exists and simply has nothing recorded against it. The soft-delete
   * extension scopes this to non-deleted leads automatically; the nested
   * `business` filter is explicit because the extension doesn't reach
   * through relations (DECISIONS.md D-019).
   */
  private async assertLeadExists(leadId: string): Promise<void> {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId, business: { deletedAt: null } },
      select: { id: true },
    });
    if (!lead) {
      throw new LeadNotFoundException();
    }
  }
}
