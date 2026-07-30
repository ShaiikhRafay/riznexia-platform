import { describe, expect, it, vi } from 'vitest';
import { isSoftDeleteModel, scopeToNotDeleted, softDeleteExtension } from './soft-delete.extension';

const { $allModels } = softDeleteExtension.query;

describe('isSoftDeleteModel', () => {
  it.each(['TeamMember', 'Business', 'Lead', 'Website'])('is true for %s', (model) => {
    expect(isSoftDeleteModel(model)).toBe(true);
  });

  it.each(['CostEvent', 'AuditLog', 'BusinessAnalysis', undefined])('is false for %s', (model) => {
    expect(isSoftDeleteModel(model)).toBe(false);
  });
});

describe('scopeToNotDeleted', () => {
  it('adds deletedAt: null to an empty where', () => {
    expect(scopeToNotDeleted(undefined)).toEqual({ deletedAt: null });
  });

  it('preserves existing filters alongside deletedAt: null', () => {
    expect(scopeToNotDeleted({ city: 'Karachi' })).toEqual({
      city: 'Karachi',
      deletedAt: null,
    });
  });

  it('overrides a caller-supplied deletedAt filter — soft-delete scoping always wins', () => {
    expect(scopeToNotDeleted({ deletedAt: { not: null } })).toEqual({ deletedAt: null });
  });
});

describe('softDeleteExtension query hooks — read operations', () => {
  const readHooks = [
    'findFirst',
    'findFirstOrThrow',
    'findMany',
    'findUnique',
    'findUniqueOrThrow',
    'count',
  ] as const;

  it.each(readHooks)('%s scopes to deletedAt: null for a soft-delete model', async (hook) => {
    const query = vi.fn().mockResolvedValue('result');
    const result = await $allModels[hook]({
      model: 'Lead',
      args: { where: { pipelineStage: 'NEW' } },
      query,
    });

    expect(query).toHaveBeenCalledWith({
      where: { pipelineStage: 'NEW', deletedAt: null },
    });
    expect(result).toBe('result');
  });

  it.each(readHooks)('%s passes through untouched for a non-soft-delete model', async (hook) => {
    const query = vi.fn().mockResolvedValue('result');
    const args = { where: { eventType: 'places_search' } };
    await $allModels[hook]({ model: 'CostEvent', args, query });

    expect(query).toHaveBeenCalledWith(args);
  });
});

describe('softDeleteExtension query hooks — delete rerouting', () => {
  it('reroutes delete to an update setting deletedAt for a soft-delete model', async () => {
    const query = vi.fn().mockResolvedValue('result');
    await $allModels.delete({
      model: 'Business',
      args: { where: { id: 'biz-1' } },
      query,
    });

    expect(query).toHaveBeenCalledTimes(1);
    const [calledWith] = query.mock.calls[0] as [{ where: unknown; data: { deletedAt: Date } }];
    expect(calledWith.where).toEqual({ id: 'biz-1' });
    expect(calledWith.data.deletedAt).toBeInstanceOf(Date);
  });

  it('reroutes deleteMany to updateMany, also scoping the where to not-yet-deleted rows', async () => {
    const query = vi.fn().mockResolvedValue('result');
    await $allModels.deleteMany({
      model: 'Website',
      args: { where: { leadId: 'lead-1' } },
      query,
    });

    const [calledWith] = query.mock.calls[0] as [
      { where: Record<string, unknown>; data: { deletedAt: Date } },
    ];
    expect(calledWith.where).toEqual({ leadId: 'lead-1', deletedAt: null });
    expect(calledWith.data.deletedAt).toBeInstanceOf(Date);
  });

  it('leaves delete/deleteMany untouched for a model without deletedAt', async () => {
    const query = vi.fn().mockResolvedValue('result');
    const args = { where: { id: 'audit-1' } };
    await $allModels.delete({ model: 'AuditLog', args, query });

    expect(query).toHaveBeenCalledWith(args);
  });
});
