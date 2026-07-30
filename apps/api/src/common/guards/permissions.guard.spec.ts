import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import type { TeamRole } from '@riznexia/shared-types';
import { ForbiddenPermissionException } from '../exceptions/app.exception';
import { PermissionsGuard } from './permissions.guard';

function makeContext(role: TeamRole): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('PermissionsGuard', () => {
  let reflector: { getAllAndOverride: jest.Mock };
  let guard: PermissionsGuard;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new PermissionsGuard(reflector as unknown as Reflector);
  });

  it('allows any authenticated role when no @RequirePermissions() decorator is present', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    expect(guard.canActivate(makeContext('viewer'))).toBe(true);
  });

  it('allows any authenticated role when @RequirePermissions() is empty', () => {
    reflector.getAllAndOverride.mockReturnValue([]);
    expect(guard.canActivate(makeContext('viewer'))).toBe(true);
  });

  it('allows a role that has every required permission', () => {
    reflector.getAllAndOverride.mockReturnValue(['leads:read', 'discovery:run']);
    expect(guard.canActivate(makeContext('sales_executive'))).toBe(true);
  });

  it('rejects a role missing even one required permission', () => {
    reflector.getAllAndOverride.mockReturnValue(['leads:read', 'leads:delete']);
    expect(() => guard.canActivate(makeContext('sales_executive'))).toThrow(
      ForbiddenPermissionException,
    );
  });

  it('rejects viewer on a write permission', () => {
    reflector.getAllAndOverride.mockReturnValue(['leads:write']);
    expect(() => guard.canActivate(makeContext('viewer'))).toThrow(ForbiddenPermissionException);
  });

  it('allows super_admin on every permission', () => {
    reflector.getAllAndOverride.mockReturnValue(['leads:delete', 'team:manage', 'system:debug']);
    expect(guard.canActivate(makeContext('super_admin'))).toBe(true);
  });
});
