import { describe, expect, it } from 'vitest';
import {
  createCrmTaskSchema,
  crmTaskSchema,
  listCrmTasksQuerySchema,
  updateCrmTaskSchema,
} from './crm-task';

const UUID_A = '11111111-1111-4111-8111-111111111111';

function validTask(overrides: Record<string, unknown> = {}) {
  return {
    id: UUID_A,
    leadId: UUID_A,
    title: 'Follow up with Joe',
    description: null,
    dueDate: new Date().toISOString(),
    priority: 'medium',
    status: 'pending',
    assignedToId: null,
    reminderAt: null,
    estimatedDurationMinutes: null,
    actualDurationMinutes: null,
    completedById: null,
    completedAt: null,
    createdById: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('crmTaskSchema', () => {
  it('accepts a valid task', () => {
    expect(crmTaskSchema.safeParse(validTask()).success).toBe(true);
  });

  it('accepts a fully-completed task with duration/completedBy', () => {
    expect(
      crmTaskSchema.safeParse(
        validTask({
          status: 'completed',
          estimatedDurationMinutes: 30,
          actualDurationMinutes: 45,
          completedById: UUID_A,
          completedAt: new Date().toISOString(),
        }),
      ).success,
    ).toBe(true);
  });

  it('rejects an unknown priority', () => {
    expect(crmTaskSchema.safeParse(validTask({ priority: 'critical' })).success).toBe(false);
  });
});

describe('createCrmTaskSchema', () => {
  it('defaults priority to medium', () => {
    const result = createCrmTaskSchema.safeParse({
      title: 'Call back',
      dueDate: new Date().toISOString(),
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.priority).toBe('medium');
  });

  it('rejects a missing title', () => {
    expect(createCrmTaskSchema.safeParse({ dueDate: new Date().toISOString() }).success).toBe(
      false,
    );
  });
});

describe('updateCrmTaskSchema', () => {
  it('rejects an empty body', () => {
    expect(updateCrmTaskSchema.safeParse({}).success).toBe(false);
  });

  it('accepts marking a task completed with actual duration', () => {
    expect(
      updateCrmTaskSchema.safeParse({ status: 'completed', actualDurationMinutes: 20 }).success,
    ).toBe(true);
  });
});

describe('listCrmTasksQuerySchema', () => {
  it('defaults limit to 25', () => {
    const result = listCrmTasksQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.limit).toBe(25);
  });

  it('accepts filtering by assignedToId and status', () => {
    expect(
      listCrmTasksQuerySchema.safeParse({ assignedToId: UUID_A, status: 'pending' }).success,
    ).toBe(true);
  });
});
