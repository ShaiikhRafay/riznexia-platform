import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

// Baseline IP-based abuse guard (Doc 22 §16, Doc 15 §5) — global default of
// 100 req/min/IP. Cost-bearing endpoints layer a stricter, endpoint-specific
// limit on top via @Throttle() (see discovery.controller.ts) rather than
// tightening the global default, which would also affect cheap read
// endpoints that don't need it.
@Module({
  imports: [
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60_000,
        limit: 100,
      },
    ]),
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class RateLimitModule {}
