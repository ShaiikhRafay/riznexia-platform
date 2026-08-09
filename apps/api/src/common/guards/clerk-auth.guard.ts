import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ClerkService } from '../../auth/clerk.service';
import { DevAuthService } from '../../auth/dev-auth.service';
import { TeamMemberService } from '../../auth/team-member.service';
import type { AuthenticatedRequest } from '../../auth/types/authenticated-request';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { UnauthenticatedException } from '../exceptions/app.exception';

// First link in the request chain (Doc 16 §15): validates the Clerk JWT,
// resolves the corresponding team_member, and attaches it to the request.
// Global by registration (see AuthModule) — every route is authenticated
// by default; @Public() is the only opt-out.
@Injectable()
export class ClerkAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly clerkService: ClerkService,
    private readonly teamMemberService: TeamMemberService,
    private readonly devAuthService: DevAuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    // Local-development-only Clerk bypass (see DevAuthService) — every
    // real Clerk verification line below this block is completely
    // unreached, and therefore unmodified in behavior, whenever this is
    // false (which is always true outside NODE_ENV=development).
    if (this.devAuthService.isEnabled()) {
      request.user = await this.devAuthService.getDevRequestUser();
      return true;
    }

    const token = extractBearerToken(request.headers.authorization);
    if (!token) {
      throw new UnauthenticatedException();
    }

    let clerkUserId: string;
    try {
      const payload = await this.clerkService.verifyToken(token);
      clerkUserId = payload.sub;
    } catch {
      throw new UnauthenticatedException('Token verification failed');
    }

    const member = await this.teamMemberService.findByClerkUserId(clerkUserId);
    if (!member) {
      // A valid Clerk session for a user with no (or a soft-deleted)
      // team_member row — e.g. webhook sync hasn't landed yet, or the
      // account was offboarded. Treated as unauthenticated, not a 500.
      throw new UnauthenticatedException('No active team member for this session');
    }

    request.user = this.teamMemberService.toRequestUser(member);
    return true;
  }
}

function extractBearerToken(header: string | undefined): string | null {
  if (!header?.startsWith('Bearer ')) {
    return null;
  }
  const token = header.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
}
