// DI token for the cache service — inject this rather than constructing
// RedisCacheService directly, so it's swappable for a mock in tests
// (same pattern as PRISMA_CLIENT, Doc 12 §2).
export const REDIS_CACHE = Symbol('REDIS_CACHE');
