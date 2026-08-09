import type { SalesStage as SalesStageModel } from '@riznexia/db';
import type { SalesStage } from '@riznexia/shared-types';

export function toSalesStageResponse(stage: SalesStageModel): SalesStage {
  return {
    id: stage.id,
    key: stage.key,
    name: stage.name,
    order: stage.order,
    isWon: stage.isWon,
    isLost: stage.isLost,
    color: stage.color,
    archivedAt: stage.archivedAt?.toISOString() ?? null,
    createdAt: stage.createdAt.toISOString(),
    updatedAt: stage.updatedAt.toISOString(),
  };
}
