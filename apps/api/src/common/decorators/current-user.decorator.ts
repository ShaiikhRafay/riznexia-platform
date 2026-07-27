import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import type {
  AuthenticatedRequest,
  RequestTeamMember,
} from '../../auth/types/authenticated-request';

// Pulls the identity ClerkAuthGuard already resolved off the request —
// handlers never re-derive "who is this" themselves (Doc 16 §6, §15).
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestTeamMember => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.user;
  },
);
