import type { ConfigService } from '@nestjs/config';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { Webhook } from 'svix';
import { InvalidWebhookSignatureException } from '../common/exceptions/app.exception';
import { ClerkWebhookController } from './clerk-webhook.controller';
import type { TeamMemberService } from './team-member.service';

jest.mock('svix', () => ({
  Webhook: jest.fn(),
}));

const HEADERS = {
  'svix-id': 'msg_1',
  'svix-timestamp': '1234567890',
  'svix-signature': 'v1,signature',
};

function makeRequest(rawBody?: Buffer): RawBodyRequest<Request> {
  return { rawBody } as unknown as RawBodyRequest<Request>;
}

describe('ClerkWebhookController', () => {
  let teamMemberService: {
    syncFromClerk: jest.Mock;
    softDeleteByClerkUserId: jest.Mock;
  };
  let config: { get: jest.Mock };
  let controller: ClerkWebhookController;
  let verifyMock: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    verifyMock = jest.fn();
    (Webhook as unknown as jest.Mock).mockImplementation(() => ({ verify: verifyMock }));

    teamMemberService = { syncFromClerk: jest.fn(), softDeleteByClerkUserId: jest.fn() };
    config = { get: jest.fn().mockReturnValue('whsec_test') };
    controller = new ClerkWebhookController(
      teamMemberService as unknown as TeamMemberService,
      config as unknown as ConfigService,
    );
  });

  it('rejects when the raw body is missing', async () => {
    await expect(controller.handle(makeRequest(undefined), HEADERS)).rejects.toBeInstanceOf(
      InvalidWebhookSignatureException,
    );
  });

  it('rejects when a required svix header is missing', async () => {
    const { 'svix-signature': _drop, ...incomplete } = HEADERS;
    await expect(
      controller.handle(makeRequest(Buffer.from('{}')), incomplete),
    ).rejects.toBeInstanceOf(InvalidWebhookSignatureException);
  });

  it('rejects when the signing secret is not configured', async () => {
    config.get.mockReturnValue(undefined);
    await expect(controller.handle(makeRequest(Buffer.from('{}')), HEADERS)).rejects.toBeInstanceOf(
      InvalidWebhookSignatureException,
    );
  });

  it('rejects when svix signature verification throws', async () => {
    verifyMock.mockImplementation(() => {
      throw new Error('bad signature');
    });
    await expect(controller.handle(makeRequest(Buffer.from('{}')), HEADERS)).rejects.toBeInstanceOf(
      InvalidWebhookSignatureException,
    );
  });

  it('syncs the team member on user.created', async () => {
    verifyMock.mockReturnValue({
      type: 'user.created',
      data: {
        id: 'user_1',
        first_name: 'Jane',
        last_name: 'Doe',
        email_addresses: [{ email_address: 'jane@riznexia.com' }],
      },
    });

    const result = await controller.handle(makeRequest(Buffer.from('{}')), HEADERS);

    expect(teamMemberService.syncFromClerk).toHaveBeenCalledWith({
      clerkUserId: 'user_1',
      name: 'Jane Doe',
      email: 'jane@riznexia.com',
    });
    expect(result).toEqual({ received: true });
  });

  it('soft-deletes the team member on user.deleted', async () => {
    verifyMock.mockReturnValue({ type: 'user.deleted', data: { id: 'user_1' } });

    await controller.handle(makeRequest(Buffer.from('{}')), HEADERS);

    expect(teamMemberService.softDeleteByClerkUserId).toHaveBeenCalledWith('user_1');
  });

  it('acknowledges but ignores unhandled event types', async () => {
    verifyMock.mockReturnValue({ type: 'session.created', data: { id: 'sess_1' } });

    const result = await controller.handle(makeRequest(Buffer.from('{}')), HEADERS);

    expect(teamMemberService.syncFromClerk).not.toHaveBeenCalled();
    expect(teamMemberService.softDeleteByClerkUserId).not.toHaveBeenCalled();
    expect(result).toEqual({ received: true });
  });
});
