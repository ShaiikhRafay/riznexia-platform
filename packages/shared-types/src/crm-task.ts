import { z } from 'zod';

// Module M10 (DECISIONS.md D-091) — Task Engine. Mirrors the
// `TaskPriority`/`TaskStatus` Prisma enums, lowercase per this package's
// API-contract casing split. "Follow-ups"/"Reminders" (founder's Core
// Features list) are not separate entities — a follow-up is just a
// `CrmTask`, and `reminderAt` is a stored scheduling field with no
// delivery mechanism this module (no notification channel exists yet).
export const TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_STATUSES = ['pending', 'in_progress', 'completed', 'cancelled'] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const crmTaskSchema = z.object({
  id: z.string().uuid(),
  leadId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().nullable(),
  dueDate: z.string().datetime(),
  priority: z.enum(TASK_PRIORITIES),
  status: z.enum(TASK_STATUSES),
  assignedToId: z.string().uuid().nullable(),
  reminderAt: z.string().datetime().nullable(),
  // Module M10 (DECISIONS.md D-091) — founder's explicit Decision 4.
  estimatedDurationMinutes: z.number().int().positive().nullable(),
  actualDurationMinutes: z.number().int().positive().nullable(),
  completedById: z.string().uuid().nullable(),
  completedAt: z.string().datetime().nullable(),
  createdById: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type CrmTask = z.infer<typeof crmTaskSchema>;

export const TASK_TITLE_MAX_LENGTH = 200;
export const TASK_DESCRIPTION_MAX_LENGTH = 5000;

export const createCrmTaskSchema = z.object({
  title: z.string().trim().min(1).max(TASK_TITLE_MAX_LENGTH),
  description: z.string().trim().min(1).max(TASK_DESCRIPTION_MAX_LENGTH).optional(),
  dueDate: z.string().datetime(),
  priority: z.enum(TASK_PRIORITIES).optional().default('medium'),
  assignedToId: z.string().uuid().optional(),
  reminderAt: z.string().datetime().optional(),
  estimatedDurationMinutes: z.number().int().positive().optional(),
});
export type CreateCrmTaskInput = z.infer<typeof createCrmTaskSchema>;

// PATCH semantics, same "omitted vs. explicit null" distinction as Lead's
// own updateLeadSchema. `status: 'completed'` is the trigger the service
// layer uses to stamp `completedAt`/`completedById` — this schema only
// validates shape, not that transition's side effects.
export const updateCrmTaskSchema = z
  .object({
    title: z.string().trim().min(1).max(TASK_TITLE_MAX_LENGTH).optional(),
    description: z.string().trim().min(1).max(TASK_DESCRIPTION_MAX_LENGTH).nullable().optional(),
    dueDate: z.string().datetime().optional(),
    priority: z.enum(TASK_PRIORITIES).optional(),
    status: z.enum(TASK_STATUSES).optional(),
    assignedToId: z.string().uuid().nullable().optional(),
    reminderAt: z.string().datetime().nullable().optional(),
    estimatedDurationMinutes: z.number().int().positive().nullable().optional(),
    actualDurationMinutes: z.number().int().positive().nullable().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided',
  });
export type UpdateCrmTaskInput = z.infer<typeof updateCrmTaskSchema>;

// GET /crm/tasks — cross-lead task list (founder's "a rep wants to see
// all their tasks across every lead" need), distinct from the per-lead
// GET /leads/:id/tasks (which needs no filters beyond pagination).
export const listCrmTasksQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  assignedToId: z.string().uuid().optional(),
  status: z.enum(TASK_STATUSES).optional(),
  dueBefore: z.string().datetime().optional(),
  dueAfter: z.string().datetime().optional(),
});
export type ListCrmTasksQuery = z.infer<typeof listCrmTasksQuerySchema>;

export const listLeadTasksQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  status: z.enum(TASK_STATUSES).optional(),
});
export type ListLeadTasksQuery = z.infer<typeof listLeadTasksQuerySchema>;
