# @riznexia/cache

Upstash Redis client wrapper. Not a general HTTP cache (Next.js/Vercel cover that) — this exists specifically for rate limiting, cost-quota counters, and discovery-result caching, per [System Architecture §10](../../docs/16-system-architecture.md#10-cache-layer-new-relative-to-phase-1-docs).

## Usage

```ts
import { redisCache, RedisCacheService } from '@riznexia/cache';

const cache = new RedisCacheService(redisCache);

await cache.getOrSetJson('discovery:karachi:restaurant', 60 * 60 * 24, async () => {
  return fetchFromPlacesApi(); // only called on a cache miss
});

await cache.incrementCounter('cost:monthly:org', costUsd, 60 * 60 * 24 * 31);
```

## Local development

`@upstash/redis` speaks Upstash's HTTP REST protocol, **not** the standard Redis wire protocol — a plain `redis:7-alpine` container is not directly compatible. Local dev uses [`serverless-redis-http`](https://github.com/hiett/serverless-redis-http) as a sidecar in `docker-compose.yml`, proxying the standard Redis container behind an Upstash-REST-compatible endpoint (see [DECISIONS.md D-006](../../DECISIONS.md)).

```bash
docker compose up -d redis redis-http-proxy
# apps/api/.env.local: UPSTASH_REDIS_REST_URL="http://localhost:8079", UPSTASH_REDIS_REST_TOKEN="dev-token"
```
