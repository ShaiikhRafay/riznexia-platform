import type { ArgumentsHost } from '@nestjs/common';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  NotFoundException,
  UnauthorizedException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { UnauthenticatedException } from '../exceptions/app.exception';
import { HttpExceptionFilter } from './http-exception.filter';

function makeHost(): { host: ArgumentsHost; response: { status: jest.Mock; json: jest.Mock } } {
  const response = { status: jest.fn(), json: jest.fn() };
  response.status.mockReturnValue(response);
  const host = {
    switchToHttp: () => ({ getResponse: () => response }),
  } as unknown as ArgumentsHost;
  return { host, response };
}

describe('HttpExceptionFilter', () => {
  const filter = new HttpExceptionFilter();

  it('maps an AppException to its explicit code', () => {
    const { host, response } = makeHost();
    filter.catch(new UnauthenticatedException('no token'), host);
    expect(response.status).toHaveBeenCalledWith(401);
    expect(response.json).toHaveBeenCalledWith({
      error: { code: 'UNAUTHENTICATED', message: 'no token', details: {} },
    });
  });

  it('maps a built-in NotFoundException to RESOURCE_NOT_FOUND', () => {
    const { host, response } = makeHost();
    filter.catch(new NotFoundException('missing'), host);
    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ code: 'RESOURCE_NOT_FOUND' }) }),
    );
  });

  it('maps a built-in BadRequestException to VALIDATION_ERROR', () => {
    const { host, response } = makeHost();
    filter.catch(new BadRequestException('bad input'), host);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ code: 'VALIDATION_ERROR' }) }),
    );
  });

  it('maps a non-HTTP error to a generic 500 INTERNAL_ERROR without leaking the message', () => {
    const { host, response } = makeHost();
    filter.catch(new Error('some internal detail'), host);
    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred', details: {} },
    });
  });

  it.each([
    [new UnauthorizedException(), 'UNAUTHENTICATED'],
    [new ForbiddenException(), 'FORBIDDEN'],
    [new ConflictException(), 'CONFLICT'],
    [new HttpException('Too many requests', HttpStatus.TOO_MANY_REQUESTS), 'RATE_LIMITED'],
    [new ServiceUnavailableException(), 'INTERNAL_ERROR'], // unmapped status -> default branch
  ] as const)('maps built-in %p to fallback code %s', (exception, expectedCode) => {
    const { host, response } = makeHost();
    filter.catch(exception, host);
    expect(response.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ code: expectedCode }) }),
    );
  });
});
