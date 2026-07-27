import { Redis } from '@upstash/redis';

// Singleton pattern — same reasoning as packages/db/src/client.ts: avoid
// re-creating the client (and its underlying HTTP connection pool) on every
// hot-reload in dev.
const globalForRedis = globalThis as unknown as { redisCache?: Redis };

export const redisCache: Redis =
  globalForRedis.redisCache ??
  new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL ?? '',
    token: process.env.UPSTASH_REDIS_REST_TOKEN ?? '',
  });

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redisCache = redisCache;
}
