import type { CallHandler, ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { lastValueFrom, of, throwError } from 'rxjs';
import { AuditLogInterceptor } from './audit-log.interceptor';
import type { AuditLogService } from './audit-log.service';

function makeContext(params: Record<string, string> = {}): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({
        user: { id: 'user-1' },
        params,
        ip: '10.0.0.1',
      }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

describe('AuditLogInterceptor', () => {
  let reflector: { getAllAndOverride: jest.Mock };
  let auditLogService: { record: jest.Mock };
  let interceptor: AuditLogInterceptor;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    auditLogService = { record: jest.fn().mockResolvedValue(undefined) };
    interceptor = new AuditLogInterceptor(
      reflector as unknown as Reflector,
      auditLogService as unknown as AuditLogService,
    );
  });

  it('passes the response through untouched and records nothing when no @Audited() decorator is present', async () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const handler: CallHandler = { handle: () => of({ id: 'x' }) };

    const result = await lastValueFrom(interceptor.intercept(makeContext(), handler));

    expect(result).toEqual({ id: 'x' });
    expect(auditLogService.record).not.toHaveBeenCalled();
  });

  it('records the action using the route param as entityId when present', async () => {
    reflector.getAllAndOverride.mockReturnValue({ action: 'lead.deleted', entityType: 'Lead' });
    const handler: CallHandler = { handle: () => of({ success: true }) };

    await lastValueFrom(interceptor.intercept(makeContext({ id: 'lead-1' }), handler));

    expect(auditLogService.record).toHaveBeenCalledWith({
      actorId: 'user-1',
      action: 'lead.deleted',
      entityType: 'Lead',
      entityId: 'lead-1',
      ipAddress: '10.0.0.1',
    });
  });

  it('falls back to the response body id when no route param matches', async () => {
    reflector.getAllAndOverride.mockReturnValue({ action: 'lead.created', entityType: 'Lead' });
    const handler: CallHandler = { handle: () => of({ id: 'lead-new' }) };

    await lastValueFrom(interceptor.intercept(makeContext({}), handler));

    expect(auditLogService.record).toHaveBeenCalledWith(
      expect.objectContaining({ entityId: 'lead-new' }),
    );
  });

  it('respects a custom entityIdParam', async () => {
    reflector.getAllAndOverride.mockReturnValue({
      action: 'team_member.role_changed',
      entityType: 'TeamMember',
      entityIdParam: 'memberId',
    });
    const handler: CallHandler = { handle: () => of({ id: 'unrelated' }) };

    await lastValueFrom(interceptor.intercept(makeContext({ memberId: 'member-1' }), handler));

    expect(auditLogService.record).toHaveBeenCalledWith(
      expect.objectContaining({ entityId: 'member-1' }),
    );
  });

  it('does not record anything when the handler throws', async () => {
    reflector.getAllAndOverride.mockReturnValue({ action: 'lead.deleted', entityType: 'Lead' });
    const handler: CallHandler = { handle: () => throwError(() => new Error('boom')) };

    await expect(
      lastValueFrom(interceptor.intercept(makeContext({ id: 'lead-1' }), handler)),
    ).rejects.toThrow('boom');
    expect(auditLogService.record).not.toHaveBeenCalled();
  });
});
