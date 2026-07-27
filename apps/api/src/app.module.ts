import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { CacheModule } from './common/cache/cache.module';
import { CostModule } from './common/cost/cost.module';
import { DatabaseModule } from './common/database/database.module';
import { DiscoveryModule } from './discovery/discovery.module';
import { HealthModule } from './health/health.module';
import { LeadsModule } from './leads/leads.module';

// Root module. Feature modules beyond auth/discovery/leads (Doc 16 §3
// bounded contexts: generation, deployment, pitch, team) are added here
// as their own modules per Doc 21's module plan, one at a time.
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    CacheModule,
    CostModule,
    AuthModule,
    HealthModule,
    LeadsModule,
    DiscoveryModule,
  ],
})
export class AppModule {}
