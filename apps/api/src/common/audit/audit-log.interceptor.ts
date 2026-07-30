import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { AuthenticatedRequest } from '../../auth/types/authenticated-request';
import { AUDITED_KEY, type AuditedOptions } from '../decorators/audited.decorator';
import { AuditLogService } from './audit-log.service';

// Module M3 (DECISIONS.md D-023). Global interceptor, no-op unless a route
// carries @Audited() (same opt-in pattern as the RBAC guards). Uses `tap`
// deliberately, not a full pipe with error handling: `tap`'s next-callback
// only runs on a successful emission, so a handler that throws never
// produces an audit entry — this records privileged actions that actually
// happened, not attempts.
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditLogService: AuditLogService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const options = this.reflector.getAllAndOverride<AuditedOptions | undefined>(AUDITED_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!options) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    return next.handle().pipe(
      tap((response: unknown) => {
        void this.auditLogService.record({
          actorId: request.user?.id ?? null,
          action: options.action,
          entityType: options.entityType,
          entityId: extractEntityId(options, request, response),
          ipAddress: request.ip ?? null,
        });
      }),
    );
  }
}

function extractEntityId(
  options: AuditedOptions,
  request: AuthenticatedRequest,
  response: unknown,
): string {
  const paramName = options.entityIdParam ?? 'id';
  const paramValue = request.params?.[paramName];
  if (typeof paramValue === 'string' && paramValue.length > 0) {
    return paramValue;
  }
  if (response && typeof response === 'object' && 'id' in response) {
    const id = (response as { id: unknown }).id;
    if (typeof id === 'string') {
      return id;
    }
  }
  return 'unknown';
}
