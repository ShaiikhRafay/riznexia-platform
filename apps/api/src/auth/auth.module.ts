import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ClerkAuthGuard } from '../common/guards/clerk-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { ClerkService } from './clerk.service';
import { ClerkWebhookController } from './clerk-webhook.controller';
import { MeController } from './me.controller';
import { TeamMemberService } from './team-member.service';

// Registers ClerkAuthGuard then RolesGuard as global guards (order matters —
// Nest applies APP_GUARD providers in registration order, matching the
// request chain in Doc 16 §15: auth resolves `request.user` before any
// role check can run against it).
@Module({
  controllers: [MeController, ClerkWebhookController],
  providers: [
    ClerkService,
    TeamMemberService,
    { provide: APP_GUARD, useClass: ClerkAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
  exports: [TeamMemberService],
})
export class AuthModule {}
