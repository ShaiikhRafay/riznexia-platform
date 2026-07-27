import { Global, Module } from '@nestjs/common';
import { RedisCacheService, redisCache } from '@riznexia/cache';
import { REDIS_CACHE } from './cache.constants';

// Global for the same reason as DatabaseModule — every feature module can
// @Inject(REDIS_CACHE) without individually importing this module.
@Global()
@Module({
  providers: [{ provide: REDIS_CACHE, useValue: new RedisCacheService(redisCache) }],
  exports: [REDIS_CACHE],
})
export class CacheModule {}
