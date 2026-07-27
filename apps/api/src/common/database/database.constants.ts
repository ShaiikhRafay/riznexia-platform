// DI token for the Prisma client — inject this rather than importing
// `prisma` from @riznexia/db directly, so it's swappable for a mock in
// tests (Doc 13 §2, Doc 12 §2: external I/O goes through DI, never ad hoc).
export const PRISMA_CLIENT = Symbol('PRISMA_CLIENT');
