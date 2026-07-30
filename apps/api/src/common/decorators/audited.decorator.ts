import { SetMetadata } from '@nestjs/common';

export interface AuditedOptions {
  /** Free-text action name, e.g. "lead.stage_changed" — stored verbatim in AuditLog.action. */
  action: string;
  entityType: string;
  /** Route param holding the entity's id. Defaults to 'id'. Falls back to the response body's `id` field if the param isn't present (e.g. on a create). */
  entityIdParam?: string;
}

// Module M3 (DECISIONS.md D-023). Marks a route as a privileged action
// worth recording — AuditLogInterceptor does the actual writing, after the
// handler succeeds (never on a failed/rejected request).
export const AUDITED_KEY = 'audited';
export const Audited = (options: AuditedOptions): MethodDecorator =>
  SetMetadata(AUDITED_KEY, options);
