import type { ConfigService } from '@nestjs/config';
import { verifyToken } from '@clerk/backend';
import { ClerkService } from './clerk.service';

jest.mock('@clerk/backend', () => ({
  verifyToken: jest.fn(),
}));

describe('ClerkService', () => {
  const verifyTokenMock = verifyToken as jest.Mock;
  let service: ClerkService;

  beforeEach(() => {
    jest.resetAllMocks();
    const configMock = {
      get: jest.fn().mockReturnValue('sk_test_secret'),
    } as unknown as ConfigService;
    service = new ClerkService(configMock);
  });

  it('verifies the token with the configured secret key and returns the subject', async () => {
    verifyTokenMock.mockResolvedValue({ sub: 'user_abc' });

    const result = await service.verifyToken('a.jwt.token');

    expect(verifyTokenMock).toHaveBeenCalledWith('a.jwt.token', { secretKey: 'sk_test_secret' });
    expect(result).toEqual({ sub: 'user_abc' });
  });

  it('propagates rejection for an invalid token', async () => {
    verifyTokenMock.mockRejectedValue(new Error('invalid token'));
    await expect(service.verifyToken('bad.token')).rejects.toThrow('invalid token');
  });
});
