import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Prisma, PrismaClient } from '@riznexia/db';
import { PRISMA_CLIENT } from '../database/database.constants';

export interface RecordAuditLogInput {
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string | null;
}

// Module M3 (DECISIONS.md D-023) — the write path for the `AuditLog` table,
// which existed in the schema since M0 but had nothing writing to it until
// now (Doc 18's audit-logging intent, finally closed). Called directly by
// AuditLogInterceptor for any route decorated with `@Audited()`; also
// exported for a service to call explicitly if an action needs auditing
// outside a simple "did this HTTP call succeed" shape.
@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(@Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient) {}

  /**
   * Best-effort: a failure to write an audit log must never fail the
   * privileged action it's describing (the action already succeeded by the
   * time this is called — see AuditLogInterceptor). Logged, not thrown.
   */
  async record(input: RecordAuditLogInput): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId: input.actorId,
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId,
          metadata: input.metadata,
          ipAddress: input.ipAddress ?? null,
        },
      });
    } catch (error) {
      this.logger.error(
        `Failed to write audit log for ${input.action} on ${input.entityType}:${input.entityId}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
