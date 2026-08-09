import type { CrmTask as CrmTaskModel } from '@riznexia/db';
import type { CrmTask } from '@riznexia/shared-types';
import { toApiTaskPriority, toApiTaskStatus } from '../crm-task.mapper';

export function toCrmTaskResponse(task: CrmTaskModel): CrmTask {
  return {
    id: task.id,
    leadId: task.leadId,
    title: task.title,
    description: task.description,
    dueDate: task.dueDate.toISOString(),
    priority: toApiTaskPriority(task.priority),
    status: toApiTaskStatus(task.status),
    assignedToId: task.assignedToId,
    reminderAt: task.reminderAt?.toISOString() ?? null,
    estimatedDurationMinutes: task.estimatedDurationMinutes,
    actualDurationMinutes: task.actualDurationMinutes,
    completedById: task.completedById,
    completedAt: task.completedAt?.toISOString() ?? null,
    createdById: task.createdById,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}
