import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import type { TeamRole } from '@riznexia/shared-types';
import { ForbiddenRoleException } from '../exceptions/app.exception';
import { MinRoleGuard } from './min-role.guard';

function makeContext(role: TeamRole): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('MinRoleGuard', () => {
  let reflector: { getAllAndOverride: jest.Mock };
  let guard: MinRoleGuard;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new MinRoleGuard(reflector as unknown as Reflector);
  });

  it('allows any authenticated role when no @MinRole() decorator is present', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    expect(guard.canActivate(makeContext('viewer'))).toBe(true);
  });

  it('allows a role that exactly meets the minimum', () => {
    reflector.getAllAndOverride.mockReturnValue('sales_manager');
    expect(guard.canActivate(makeContext('sales_manager'))).toBe(true);
  });

  it('allows a role that exceeds the minimum', () => {
    reflector.getAllAndOverride.mockReturnValue('sales_manager');
    expect(guard.canActivate(makeContext('super_admin'))).toBe(true);
  });

  it('rejects a role below the minimum', () => {
    reflector.getAllAndOverride.mockReturnValue('sales_manager');
    expect(() => guard.canActivate(makeContext('sales_executive'))).toThrow(ForbiddenRoleException);
  });

  it('rejects developer against a sales_manager minimum despite developer outranking sales_executive', () => {
    reflector.getAllAndOverride.mockReturnValue('sales_manager');
    expect(() => guard.canActivate(makeContext('developer'))).toThrow(ForbiddenRoleException);
  });
});
