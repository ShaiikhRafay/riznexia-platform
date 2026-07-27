import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import type { TeamRole } from '@riznexia/shared-types';
import { ForbiddenRoleException } from '../exceptions/app.exception';
import { RolesGuard } from './roles.guard';

function makeContext(role: TeamRole): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let reflector: { getAllAndOverride: jest.Mock };
  let guard: RolesGuard;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  it('allows any authenticated role when no @Roles() decorator is present', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    expect(guard.canActivate(makeContext('sales_rep'))).toBe(true);
  });

  it('allows any authenticated role when @Roles() is empty', () => {
    reflector.getAllAndOverride.mockReturnValue([]);
    expect(guard.canActivate(makeContext('sales_rep'))).toBe(true);
  });

  it('allows a request whose role is in the required list', () => {
    reflector.getAllAndOverride.mockReturnValue(['admin', 'manager']);
    expect(guard.canActivate(makeContext('manager'))).toBe(true);
  });

  it('rejects a request whose role is not in the required list', () => {
    reflector.getAllAndOverride.mockReturnValue(['admin', 'manager']);
    expect(() => guard.canActivate(makeContext('sales_rep'))).toThrow(ForbiddenRoleException);
  });
});
