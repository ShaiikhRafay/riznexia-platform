import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import type { ClerkService } from '../../auth/clerk.service';
import type { DevAuthService } from '../../auth/dev-auth.service';
import type { TeamMemberService } from '../../auth/team-member.service';
import { UnauthenticatedException } from '../exceptions/app.exception';
import { ClerkAuthGuard } from './clerk-auth.guard';

function makeContext(headers: Record<string, string> = {}): {
  context: ExecutionContext;
  request: { headers: Record<string, string>; user?: unknown };
} {
  const request = { headers, user: undefined as unknown };
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
  return { context, request };
}

describe('ClerkAuthGuard', () => {
  let reflector: { getAllAndOverride: jest.Mock };
  let clerkService: { verifyToken: jest.Mock };
  let teamMemberService: { findByClerkUserId: jest.Mock; toRequestUser: jest.Mock };
  let devAuthService: { isEnabled: jest.Mock; getDevRequestUser: jest.Mock };
  let guard: ClerkAuthGuard;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) };
    clerkService = { verifyToken: jest.fn() };
    teamMemberService = { findByClerkUserId: jest.fn(), toRequestUser: jest.fn() };
    // Defaults to disabled in every existing test below — proves the real
    // Clerk verification path is completely unchanged when dev-auth is off.
    devAuthService = { isEnabled: jest.fn().mockReturnValue(false), getDevRequestUser: jest.fn() };
    guard = new ClerkAuthGuard(
      reflector as unknown as Reflector,
      clerkService as unknown as ClerkService,
      teamMemberService as unknown as TeamMemberService,
      devAuthService as unknown as DevAuthService,
    );
  });

  it('allows a @Public() route without inspecting the token', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const { context } = makeContext();

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(clerkService.verifyToken).not.toHaveBeenCalled();
  });

  it('rejects a request with no Authorization header', async () => {
    const { context } = makeContext();
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthenticatedException);
  });

  it('rejects a malformed Authorization header (no Bearer prefix)', async () => {
    const { context } = makeContext({ authorization: 'Token abc123' });
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthenticatedException);
  });

  it('rejects an empty bearer token', async () => {
    const { context } = makeContext({ authorization: 'Bearer    ' });
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthenticatedException);
  });

  it('rejects when Clerk fails to verify the token', async () => {
    clerkService.verifyToken.mockRejectedValue(new Error('invalid'));
    const { context } = makeContext({ authorization: 'Bearer good.looking.jwt' });
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthenticatedException);
  });

  it('rejects a valid token with no matching (or soft-deleted) team member', async () => {
    clerkService.verifyToken.mockResolvedValue({ sub: 'user_1' });
    teamMemberService.findByClerkUserId.mockResolvedValue(null);
    const { context } = makeContext({ authorization: 'Bearer valid.jwt' });
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthenticatedException);
  });

  it('attaches the resolved user and allows the request through', async () => {
    clerkService.verifyToken.mockResolvedValue({ sub: 'user_1' });
    const member = { id: 'db-id', clerkUserId: 'user_1', role: 'sales_executive' };
    teamMemberService.findByClerkUserId.mockResolvedValue({ id: 'db-id' });
    teamMemberService.toRequestUser.mockReturnValue(member);

    const { context, request } = makeContext({ authorization: 'Bearer valid.jwt' });
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toBe(member);
  });

  describe('when DevAuthService.isEnabled() is true (local development only)', () => {
    it('attaches the dev Super Admin user without ever calling Clerk, even with no Authorization header', async () => {
      devAuthService.isEnabled.mockReturnValue(true);
      const devUser = {
        id: 'dev-db-id',
        clerkUserId: 'user_fixture_super_admin',
        role: 'super_admin',
      };
      devAuthService.getDevRequestUser.mockResolvedValue(devUser);

      const { context, request } = makeContext(); // no Authorization header at all
      await expect(guard.canActivate(context)).resolves.toBe(true);

      expect(request.user).toBe(devUser);
      expect(clerkService.verifyToken).not.toHaveBeenCalled();
      expect(teamMemberService.findByClerkUserId).not.toHaveBeenCalled();
    });

    it('still requires a real Clerk token once dev-auth reports disabled again', async () => {
      devAuthService.isEnabled.mockReturnValue(false);
      const { context } = makeContext();
      await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthenticatedException);
    });
  });
});
