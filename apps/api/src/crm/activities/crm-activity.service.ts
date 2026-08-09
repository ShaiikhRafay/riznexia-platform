import { Inject, Injectable } from '@nestjs/common';
import type { Prisma, PrismaClient } from '@riznexia/db';
import type { LogLeadActivityInput } from '@riznexia/shared-types';
import { toPrismaLeadActivityType } from '../../leads/lead-activity.mapper';
import { LeadActivityService } from '../../leads/lead-activity.service';
import { PRISMA_CLIENT } from '../../common/database/database.constants';
import { LeadCrmService } from '../pipeline/lead-crm.service';

// Module M10 (DECISIONS.md D-086) — Activity Engine. Reuses
// `LeadActivityService` (founder's Decision 5 — one unified timeline, not
// a parallel one). Its only original responsibility is the manual-logging
// entry point plus keeping `LeadCRM.lastActivityAt` current — the
// denormalized pointer the Pipeline Engine's schema comment says this
// engine owns.
@Injectable()
export class CrmActivityService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    private readonly leadActivityService: LeadActivityService,
    private readonly leadCrmService: LeadCrmService,
  ) {}

  async logManualActivity(
    leadId: string,
    input: LogLeadActivityInput,
    actorId: string | null,
  ): Promise<void> {
    // Lazily creates the LeadCRM row on first CRM touch and throws
    // LeadNotFoundException for an unknown lead — doubles as this
    // method's own existence check.
    await this.leadCrmService.getForLead(leadId);

    const detail: Record<string, unknown> = {
      ...(input.note && { note: input.note }),
      ...(input.occurredAt && { occurredAt: input.occurredAt }),
    };

    await this.prisma.$transaction(async (tx) => {
      await this.leadActivityService.record(
        {
          leadId,
          actorId,
          type: toPrismaLeadActivityType(input.type),
          detail: Object.keys(detail).length > 0 ? (detail as Prisma.InputJsonValue) : undefined,
        },
        tx,
      );
      await tx.leadCRM.update({ where: { leadId }, data: { lastActivityAt: new Date() } });
    });
  }
}
