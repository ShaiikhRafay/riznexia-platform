import { Inject, Injectable } from '@nestjs/common';
import type { PrismaClient } from '@riznexia/db';
import type {
  CreateLostReasonInput,
  ListLostReasonsQuery,
  LostReason,
  UpdateLostReasonInput,
} from '@riznexia/shared-types';
import { PRISMA_CLIENT } from '../../common/database/database.constants';
import { LostReasonNotFoundException } from '../../common/exceptions/app.exception';
import { toLostReasonResponse } from './dto/lost-reason-response.dto';

// Module M10 (DECISIONS.md D-084) — Pipeline Engine. Founder's explicit
// Decision 11: a configurable table, not a fixed enum. Same archive
// (never hard-delete) discipline as `SalesStageService`.
@Injectable()
export class LostReasonService {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  async list(query: ListLostReasonsQuery): Promise<LostReason[]> {
    const rows = await this.prisma.lostReason.findMany({
      where: query.includeArchived ? {} : { archivedAt: null },
      orderBy: { order: 'asc' },
    });
    return rows.map(toLostReasonResponse);
  }

  async findByIdOrThrow(id: string) {
    const row = await this.prisma.lostReason.findUnique({ where: { id } });
    if (!row) {
      throw new LostReasonNotFoundException();
    }
    return row;
  }

  async create(input: CreateLostReasonInput): Promise<LostReason> {
    const row = await this.prisma.lostReason.create({
      data: { key: input.key, label: input.label, order: input.order },
    });
    return toLostReasonResponse(row);
  }

  async update(id: string, input: UpdateLostReasonInput): Promise<LostReason> {
    await this.findByIdOrThrow(id);
    const row = await this.prisma.lostReason.update({
      where: { id },
      data: {
        ...(input.label !== undefined && { label: input.label }),
        ...(input.order !== undefined && { order: input.order }),
      },
    });
    return toLostReasonResponse(row);
  }

  async archive(id: string): Promise<LostReason> {
    await this.findByIdOrThrow(id);
    const row = await this.prisma.lostReason.update({
      where: { id },
      data: { archivedAt: new Date() },
    });
    return toLostReasonResponse(row);
  }
}
