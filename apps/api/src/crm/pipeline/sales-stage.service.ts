import { Inject, Injectable } from '@nestjs/common';
import type { PrismaClient } from '@riznexia/db';
import type {
  CreateSalesStageInput,
  ListSalesStagesQuery,
  SalesStage,
  UpdateSalesStageInput,
} from '@riznexia/shared-types';
import { PRISMA_CLIENT } from '../../common/database/database.constants';
import { SalesStageNotFoundException } from '../../common/exceptions/app.exception';
import { toSalesStageResponse } from './dto/sales-stage-response.dto';

// Module M10 (DECISIONS.md D-084) — Pipeline Engine. The configurable
// stage list itself (founder's Decision 2/10): CRUD plus archive — never
// a real DELETE (founder's explicit Decision 10). An archived stage's id
// stays perfectly valid as a FK target for any `LeadCRM` row still
// pointing at it; archiving only removes it from `list()`'s default
// (non-`includeArchived`) result, i.e. from what a rep sees when
// choosing a stage for a lead going forward.
@Injectable()
export class SalesStageService {
  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  async list(query: ListSalesStagesQuery): Promise<SalesStage[]> {
    const rows = await this.prisma.salesStage.findMany({
      where: query.includeArchived ? {} : { archivedAt: null },
      orderBy: { order: 'asc' },
    });
    return rows.map(toSalesStageResponse);
  }

  async findByIdOrThrow(id: string) {
    const row = await this.prisma.salesStage.findUnique({ where: { id } });
    if (!row) {
      throw new SalesStageNotFoundException();
    }
    return row;
  }

  async create(input: CreateSalesStageInput): Promise<SalesStage> {
    const row = await this.prisma.salesStage.create({
      data: {
        key: input.key,
        name: input.name,
        order: input.order,
        isWon: input.isWon ?? false,
        isLost: input.isLost ?? false,
        color: input.color ?? null,
      },
    });
    return toSalesStageResponse(row);
  }

  async update(id: string, input: UpdateSalesStageInput): Promise<SalesStage> {
    await this.findByIdOrThrow(id);
    const row = await this.prisma.salesStage.update({
      where: { id },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.order !== undefined && { order: input.order }),
        ...(input.isWon !== undefined && { isWon: input.isWon }),
        ...(input.isLost !== undefined && { isLost: input.isLost }),
        ...(input.color !== undefined && { color: input.color }),
      },
    });
    return toSalesStageResponse(row);
  }

  /** Archive, never a real DELETE (founder's Decision 10). */
  async archive(id: string): Promise<SalesStage> {
    await this.findByIdOrThrow(id);
    const row = await this.prisma.salesStage.update({
      where: { id },
      data: { archivedAt: new Date() },
    });
    return toSalesStageResponse(row);
  }
}
