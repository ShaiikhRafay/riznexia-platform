import { TaskPriority as PrismaTaskPriority, TaskStatus as PrismaTaskStatus } from '@riznexia/db';
import type { TaskPriority, TaskStatus } from '@riznexia/shared-types';

// Same Prisma-uppercase / API-lowercase split as leads/lead.mapper.ts —
// explicit Record maps, never a generic toLowerCase() helper.
const PRISMA_TO_API_PRIORITY: Record<PrismaTaskPriority, TaskPriority> = {
  [PrismaTaskPriority.LOW]: 'low',
  [PrismaTaskPriority.MEDIUM]: 'medium',
  [PrismaTaskPriority.HIGH]: 'high',
  [PrismaTaskPriority.URGENT]: 'urgent',
};

const API_TO_PRISMA_PRIORITY: Record<TaskPriority, PrismaTaskPriority> = {
  low: PrismaTaskPriority.LOW,
  medium: PrismaTaskPriority.MEDIUM,
  high: PrismaTaskPriority.HIGH,
  urgent: PrismaTaskPriority.URGENT,
};

const PRISMA_TO_API_STATUS: Record<PrismaTaskStatus, TaskStatus> = {
  [PrismaTaskStatus.PENDING]: 'pending',
  [PrismaTaskStatus.IN_PROGRESS]: 'in_progress',
  [PrismaTaskStatus.COMPLETED]: 'completed',
  [PrismaTaskStatus.CANCELLED]: 'cancelled',
};

const API_TO_PRISMA_STATUS: Record<TaskStatus, PrismaTaskStatus> = {
  pending: PrismaTaskStatus.PENDING,
  in_progress: PrismaTaskStatus.IN_PROGRESS,
  completed: PrismaTaskStatus.COMPLETED,
  cancelled: PrismaTaskStatus.CANCELLED,
};

export function toApiTaskPriority(priority: PrismaTaskPriority): TaskPriority {
  return PRISMA_TO_API_PRIORITY[priority];
}

export function toPrismaTaskPriority(priority: TaskPriority): PrismaTaskPriority {
  return API_TO_PRISMA_PRIORITY[priority];
}

export function toApiTaskStatus(status: PrismaTaskStatus): TaskStatus {
  return PRISMA_TO_API_STATUS[status];
}

export function toPrismaTaskStatus(status: TaskStatus): PrismaTaskStatus {
  return API_TO_PRISMA_STATUS[status];
}
