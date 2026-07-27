import { HttpException, HttpStatus } from '@nestjs/common';

// Base for every typed domain exception in the app. The global exception
// filter (common/filters/http-exception.filter.ts) reads `.code` to build
// the error envelope from docs/19-api-architecture.md §4 — no exception
// should be thrown as a bare string-matched Error (Doc 12 §5).
export class AppException extends HttpException {
  public readonly code: string;

  constructor(
    code: string,
    message: string,
    status: HttpStatus,
    details?: Record<string, unknown>,
  ) {
    super({ code, message, details }, status);
    this.code = code;
  }
}

export class UnauthenticatedException extends AppException {
  constructor(message = 'Missing or invalid authentication token') {
    super('UNAUTHENTICATED', message, HttpStatus.UNAUTHORIZED);
  }
}

export class ForbiddenRoleException extends AppException {
  constructor(message = 'Your role does not permit this action') {
    super('FORBIDDEN', message, HttpStatus.FORBIDDEN);
  }
}

export class InvalidWebhookSignatureException extends AppException {
  constructor(message = 'Invalid webhook signature') {
    super('INVALID_WEBHOOK_SIGNATURE', message, HttpStatus.UNAUTHORIZED);
  }
}
