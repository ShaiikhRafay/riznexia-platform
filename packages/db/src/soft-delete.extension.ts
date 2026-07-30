// Doc 18 documented a `deletedAt` soft-delete pattern, but Module M1 never
// enforced it structurally — every call site (leads.service.ts,
// discovery-runner.service.ts) had to remember to add `deletedAt: null` by
// hand. This Prisma Client Extension (Doc 16 §8, DECISIONS.md D-017+) makes
// the guarantee automatic for every model that carries the column: reads
// are transparently scoped to non-deleted rows, and delete/deleteMany
// reroute to an update that sets deletedAt instead of issuing a real
// DELETE. There is deliberately no "hard delete" escape hatch here — none
// of Module M2's requirements need one; add one explicitly if a future
// module (e.g. GDPR erasure) does.
export const SOFT_DELETE_MODELS = ['TeamMember', 'Business', 'Lead', 'Website'] as const;

export type SoftDeleteModel = (typeof SOFT_DELETE_MODELS)[number];

export function isSoftDeleteModel(model: string | undefined): model is SoftDeleteModel {
  return !!model && (SOFT_DELETE_MODELS as readonly string[]).includes(model);
}

// The actual behavior, exported standalone so it's unit-testable without a
// live Prisma engine — see soft-delete.extension.test.ts. The `$extends`
// wiring below is a thin adapter around these two functions.
export function scopeToNotDeleted(
  where: Record<string, unknown> | undefined,
): Record<string, unknown> {
  return { ...where, deletedAt: null };
}

export function softDeleteMutation(): { data: { deletedAt: Date } } {
  return { data: { deletedAt: new Date() } };
}

// Prisma's `query` extension component types each hook against the exact
// per-operation args/result of the generated client, which makes a
// model-agnostic hook (this one intentionally covers all four soft-delete
// models with one function) awkward to express precisely. Loosely typing
// just this glue layer — not the exported logic above — matches Prisma's
// own published soft-delete recipe and keeps the extension readable; the
// `.$extends()` call site in client.ts still gets full inference on the
// resulting client.
type QueryHookArgs = {
  model?: string;
  args: { where?: Record<string, unknown>; data?: Record<string, unknown> };
  query: (args: unknown) => Promise<unknown>;
};

async function scopedRead({ model, args, query }: QueryHookArgs): Promise<unknown> {
  if (isSoftDeleteModel(model)) {
    return query({ ...args, where: scopeToNotDeleted(args.where) });
  }
  return query(args);
}

async function rerouteDeleteToUpdate({ model, args, query }: QueryHookArgs): Promise<unknown> {
  if (!isSoftDeleteModel(model)) {
    return query(args);
  }
  return query({ where: args.where, ...softDeleteMutation() });
}

async function rerouteDeleteManyToUpdateMany({
  model,
  args,
  query,
}: QueryHookArgs): Promise<unknown> {
  if (!isSoftDeleteModel(model)) {
    return query(args);
  }
  return query({ where: scopeToNotDeleted(args.where), ...softDeleteMutation() });
}

export const softDeleteExtension = {
  name: 'soft-delete',
  query: {
    $allModels: {
      findFirst: scopedRead,
      findFirstOrThrow: scopedRead,
      findMany: scopedRead,
      findUnique: scopedRead,
      findUniqueOrThrow: scopedRead,
      count: scopedRead,
      delete: rerouteDeleteToUpdate,
      deleteMany: rerouteDeleteManyToUpdateMany,
    },
  },
};
