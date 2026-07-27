import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';

// Root module — deliberately minimal. Feature modules (Doc 16 §3 bounded
// contexts: discovery, leads, generation, deployment, pitch, team, auth)
// are added as their own modules per Doc 21's module plan, not here.
@Module({
  imports: [HealthModule],
})
export class AppModule {}
