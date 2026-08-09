import { Inject, Injectable } from '@nestjs/common';
import type { Prisma, PrismaClient } from '@riznexia/db';
import type { CrmSettings, UpdateCrmSettingsInput } from '@riznexia/shared-types';
import { PRISMA_CLIENT } from '../../common/database/database.constants';
import { toCrmSettingsResponse } from './dto/crm-settings-response.dto';

// Module M10 (DECISIONS.md D-087) — founder's explicit Decision 12. A
// genuine singleton (same "one internal workspace" scope as
// `TeamMember`) — exactly one row, seeded by this model's own migration,
// fetched by `findFirst()` rather than a hardcoded id (there is only
// ever one row; nothing in this service — or anywhere else — ever
// creates a second one).
@Injectable()
export class CrmSettingsService {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  async get(): Promise<CrmSettings> {
    const row = await this.getRowOrThrow();
    return toCrmSettingsResponse(row);
  }

  async update(input: UpdateCrmSettingsInput): Promise<CrmSettings> {
    const existing = await this.getRowOrThrow();
    const row = await this.prisma.crmSettings.update({
      where: { id: existing.id },
      data: {
        ...(input.defaultStageId !== undefined && { defaultStageId: input.defaultStageId }),
        ...(input.currency !== undefined && { currency: input.currency }),
        ...(input.timezone !== undefined && { timezone: input.timezone }),
        ...(input.businessHours !== undefined && {
          businessHours: input.businessHours as unknown as Prisma.InputJsonValue,
        }),
        ...(input.defaultReminderMinutesBeforeDue !== undefined && {
          defaultReminderMinutesBeforeDue: input.defaultReminderMinutesBeforeDue,
        }),
      },
    });
    return toCrmSettingsResponse(row);
  }

  /**
   * Internal-assertion semantics (same as every other "this must always
   * exist" invariant in this codebase, D-052-style): the migration always
   * seeds exactly one row, so a missing one means a corrupted/incomplete
   * migration state, not a legitimate business outcome — a plain `Error`,
   * never a domain 404 a caller could reasonably branch on.
   */
  private async getRowOrThrow() {
    const row = await this.prisma.crmSettings.findFirst();
    if (!row) {
      throw new Error(
        'CrmSettingsService: no CrmSettings row exists — the M10 migration should have seeded exactly one.',
      );
    }
    return row;
  }
}
