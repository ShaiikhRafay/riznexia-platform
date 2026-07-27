import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { PrismaClient, TeamMember } from '@riznexia/db';
import { TeamRole as PrismaTeamRole } from '@riznexia/db';
import { PRISMA_CLIENT } from '../common/database/database.constants';
import { InvalidWebhookSignatureException } from '../common/exceptions/app.exception';
import { toApiRole } from './team-member.mapper';
import type { RequestTeamMember } from './types/authenticated-request';

export interface ClerkUserSyncInput {
  clerkUserId: string;
  name: string;
  email: string;
}

@Injectable()
export class TeamMemberService {
  constructor(
    @Inject(PRISMA_CLIENT) private readonly prisma: PrismaClient,
    private readonly config: ConfigService,
  ) {}

  /** Used by ClerkAuthGuard on every authenticated request. */
  async findByClerkUserId(clerkUserId: string): Promise<TeamMember | null> {
    return this.prisma.teamMember.findUnique({
      where: { clerkUserId, deletedAt: null },
    });
  }

  /** Used by GET /me to return the full profile beyond the guard's minimal RequestTeamMember. */
  async findById(id: string): Promise<TeamMember | null> {
    return this.prisma.teamMember.findUnique({ where: { id, deletedAt: null } });
  }

  toRequestUser(member: TeamMember): RequestTeamMember {
    return {
      id: member.id,
      clerkUserId: member.clerkUserId,
      role: toApiRole(member.role),
    };
  }

  /**
   * Create/update a team_member from a Clerk user.created/user.updated event
   * (Doc 04 §5 — Clerk Organizations aren't used for tenancy here, this is
   * the sync path for the single-org employee directory). Enforces the
   * domain restriction as defense-in-depth on top of Clerk's own dashboard
   * setting (Doc 15 §1) — an email outside the allowed domain is rejected
   * rather than silently synced.
   */
  async syncFromClerk(input: ClerkUserSyncInput): Promise<TeamMember> {
    const allowedDomain = this.config.get<string>('ALLOWED_EMAIL_DOMAIN');
    if (allowedDomain && !input.email.toLowerCase().endsWith(`@${allowedDomain.toLowerCase()}`)) {
      throw new InvalidWebhookSignatureException(
        `Email domain not permitted for this workspace: ${input.email}`,
      );
    }

    return this.prisma.teamMember.upsert({
      where: { clerkUserId: input.clerkUserId },
      update: { name: input.name, email: input.email },
      create: {
        clerkUserId: input.clerkUserId,
        name: input.name,
        email: input.email,
        role: PrismaTeamRole.SALES_REP, // default role; an Admin promotes as needed
      },
    });
  }

  async softDeleteByClerkUserId(clerkUserId: string): Promise<void> {
    await this.prisma.teamMember.updateMany({
      where: { clerkUserId },
      data: { deletedAt: new Date() },
    });
  }
}
