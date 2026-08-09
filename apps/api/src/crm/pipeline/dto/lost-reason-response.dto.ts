import type { LostReason as LostReasonModel } from '@riznexia/db';
import type { LostReason } from '@riznexia/shared-types';

export function toLostReasonResponse(reason: LostReasonModel): LostReason {
  return {
    id: reason.id,
    key: reason.key,
    label: reason.label,
    order: reason.order,
    archivedAt: reason.archivedAt?.toISOString() ?? null,
    createdAt: reason.createdAt.toISOString(),
    updatedAt: reason.updatedAt.toISOString(),
  };
}
