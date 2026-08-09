import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TeamMemberService } from './team-member.service';
import type { RequestTeamMember } from './types/authenticated-request';

// The exact `clerkUserId` `packages/db/prisma/seed.ts` gives its Super
// Admin fixture (`FIXTURE_TEAM_MEMBERS[0]`) — never a value invented here.
export const DEV_SUPER_ADMIN_CLERK_USER_ID = 'user_fixture_super_admin';

/**
 * Local-development-only Clerk bypass. Active ONLY when BOTH
 * `NODE_ENV=development` AND `DEV_AUTH_ENABLED=true` — either condition
 * alone leaves real Clerk verification completely untouched
 * (`ClerkAuthGuard`'s existing code path), so this can never activate in a
 * deployed environment even if `DEV_AUTH_ENABLED` were mistakenly left set
 * (a real deployment's `NODE_ENV=production` overrides it there).
 *
 * Exists so a developer without a real Clerk application (no
 * CLERK_SECRET_KEY, no way to complete Clerk's dev-browser handshake) can
 * still exercise every route locally, authenticated as the seeded Super
 * Admin fixture — every permission (`super_admin: PERMISSIONS` in
 * `permission.constants.ts` — "everything, unconditionally"), no separate
 * grant-all logic needed here.
 */
@Injectable()
export class DevAuthService {
  constructor(
    private readonly config: ConfigService,
    private readonly teamMemberService: TeamMemberService,
  ) {}

  isEnabled(): boolean {
    return (
      this.config.get<string>('NODE_ENV') === 'development' &&
      this.config.get<string>('DEV_AUTH_ENABLED') === 'true'
    );
  }

  async getDevRequestUser(): Promise<RequestTeamMember> {
    const member = await this.teamMemberService.findByClerkUserId(DEV_SUPER_ADMIN_CLERK_USER_ID);
    if (!member) {
      throw new Error(
        `DEV_AUTH_ENABLED is true but no seeded Super Admin team member exists ` +
          `(clerkUserId="${DEV_SUPER_ADMIN_CLERK_USER_ID}"). Run "pnpm --filter @riznexia/db seed".`,
      );
    }
    return this.teamMemberService.toRequestUser(member);
  }
}
