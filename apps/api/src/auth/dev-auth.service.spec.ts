import type { ConfigService } from '@nestjs/config';
import type { TeamMemberService } from './team-member.service';
import { DEV_SUPER_ADMIN_CLERK_USER_ID, DevAuthService } from './dev-auth.service';

describe('DevAuthService', () => {
  let config: { get: jest.Mock };
  let teamMemberService: { findByClerkUserId: jest.Mock; toRequestUser: jest.Mock };
  let service: DevAuthService;

  beforeEach(() => {
    config = { get: jest.fn() };
    teamMemberService = { findByClerkUserId: jest.fn(), toRequestUser: jest.fn() };
    service = new DevAuthService(
      config as unknown as ConfigService,
      teamMemberService as unknown as TeamMemberService,
    );
  });

  describe('isEnabled', () => {
    it('is false when NODE_ENV is production, regardless of DEV_AUTH_ENABLED', () => {
      config.get.mockImplementation(
        (key: string) => ({ NODE_ENV: 'production', DEV_AUTH_ENABLED: 'true' })[key],
      );
      expect(service.isEnabled()).toBe(false);
    });

    it('is false when DEV_AUTH_ENABLED is unset in development', () => {
      config.get.mockImplementation((key: string) => ({ NODE_ENV: 'development' })[key]);
      expect(service.isEnabled()).toBe(false);
    });

    it('is false when DEV_AUTH_ENABLED is any value other than the literal string "true"', () => {
      config.get.mockImplementation(
        (key: string) => ({ NODE_ENV: 'development', DEV_AUTH_ENABLED: '1' })[key],
      );
      expect(service.isEnabled()).toBe(false);
    });

    it('is true only when both NODE_ENV=development AND DEV_AUTH_ENABLED=true', () => {
      config.get.mockImplementation(
        (key: string) => ({ NODE_ENV: 'development', DEV_AUTH_ENABLED: 'true' })[key],
      );
      expect(service.isEnabled()).toBe(true);
    });
  });

  describe('getDevRequestUser', () => {
    it('looks up the seeded Super Admin fixture by its exact seed.ts clerkUserId', async () => {
      const member = {
        id: 'db-id',
        clerkUserId: DEV_SUPER_ADMIN_CLERK_USER_ID,
        role: 'SUPER_ADMIN',
      };
      teamMemberService.findByClerkUserId.mockResolvedValue(member);
      teamMemberService.toRequestUser.mockReturnValue({
        id: 'db-id',
        clerkUserId: DEV_SUPER_ADMIN_CLERK_USER_ID,
        role: 'super_admin',
      });

      const result = await service.getDevRequestUser();

      expect(teamMemberService.findByClerkUserId).toHaveBeenCalledWith(
        DEV_SUPER_ADMIN_CLERK_USER_ID,
      );
      expect(result).toEqual({
        id: 'db-id',
        clerkUserId: DEV_SUPER_ADMIN_CLERK_USER_ID,
        role: 'super_admin',
      });
    });

    it('throws a clear, actionable error when the seed fixture is missing', async () => {
      teamMemberService.findByClerkUserId.mockResolvedValue(null);
      await expect(service.getDevRequestUser()).rejects.toThrow(/pnpm --filter @riznexia\/db seed/);
    });
  });
});
