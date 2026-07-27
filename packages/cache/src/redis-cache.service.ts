import type { Redis } from '@upstash/redis';

// Generic, framework-agnostic cache helpers over an Upstash Redis client —
// Doc 16 §10 (rate limiting, cost-quota counters, discovery caching).
// Domain-specific key naming/TTL policy lives in the consuming app
// (apps/api/src/common/cost, apps/api/src/discovery), not here.
export class RedisCacheService {
  constructor(private readonly client: Redis) {}

  async getJson<T>(key: string): Promise<T | null> {
    const value = await this.client.get<T>(key);
    return value ?? null;
  }

  async setJson<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds && ttlSeconds > 0) {
      await this.client.set(key, value, { ex: ttlSeconds });
    } else {
      await this.client.set(key, value);
    }
  }

  /** Cache-aside: return the cached value, or compute + cache it on a miss. */
  async getOrSetJson<T>(key: string, ttlSeconds: number, compute: () => Promise<T>): Promise<T> {
    const cached = await this.getJson<T>(key);
    if (cached !== null) {
      return cached;
    }
    const computed = await compute();
    await this.setJson(key, computed, ttlSeconds);
    return computed;
  }

  /**
   * Atomically increments a counter, setting an expiry only the first time
   * the key is created — used for cost/quota counters with a rolling or
   * fixed-window reset (e.g. "monthly cost so far").
   */
  async incrementCounter(key: string, by: number, ttlSecondsIfNew: number): Promise<number> {
    const newValue = await this.client.incrby(key, by);
    const ttl = await this.client.ttl(key);
    if (ttl === -1) {
      // -1 = key exists with no expiry (i.e. this increment just created it,
      // or a previous expiry-set attempt was interrupted) — safe/idempotent
      // to (re)apply; a benign race with a concurrent first-write just
      // results in the same expiry being set twice.
      await this.client.expire(key, ttlSecondsIfNew);
    }
    return newValue;
  }

  /** Read a counter's current value without incrementing it. */
  async getCounter(key: string): Promise<number> {
    const value = await this.client.get<number>(key);
    return value ?? 0;
  }

  async delete(key: string): Promise<void> {
    await this.client.del(key);
  }
}
