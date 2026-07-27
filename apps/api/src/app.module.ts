import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './common/database/database.module';
import { HealthModule } from './health/health.module';

// Root module. Feature modules beyond auth (Doc 16 §3 bounded contexts:
// discovery, leads, generation, deployment, pitch, team) are added here
// as their own modules per Doc 21's module plan, one at a time.
@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), DatabaseModule, AuthModule, HealthModule],
})
export class AppModule {}
