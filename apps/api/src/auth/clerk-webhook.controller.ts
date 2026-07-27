import { Controller, Headers, Post, RawBodyRequest, Req } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { Webhook } from 'svix';
import { Public } from '../common/decorators/public.decorator';
import { InvalidWebhookSignatureException } from '../common/exceptions/app.exception';
import { TeamMemberService } from './team-member.service';

interface ClerkUserEvent {
  type: 'user.created' | 'user.updated' | 'user.deleted' | string;
  data: {
    id: string;
    email_addresses?: Array<{ email_address: string }>;
    first_name?: string | null;
    last_name?: string | null;
  };
}

const REQUIRED_SVIX_HEADERS = ['svix-id', 'svix-timestamp', 'svix-signature'] as const;

// POST /webhooks/clerk — docs/19-api-architecture.md §3. Public (signature-
// verified, not JWT-authenticated) per Doc 15 §5: every inbound webhook
// verifies its provider signature before any processing, full stop.
@Controller('webhooks/clerk')
export class ClerkWebhookController {
  constructor(
    private readonly teamMemberService: TeamMemberService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post()
  async handle(
    @Req() request: RawBodyRequest<Request>,
    @Headers() headers: Record<string, string>,
  ): Promise<{ received: true }> {
    const event = this.verifyAndParse(request, headers);

    switch (event.type) {
      case 'user.created':
      case 'user.updated':
        await this.teamMemberService.syncFromClerk({
          clerkUserId: event.data.id,
          name:
            [event.data.first_name, event.data.last_name].filter(Boolean).join(' ').trim() ||
            'Unnamed',
          email: event.data.email_addresses?.[0]?.email_address ?? '',
        });
        break;
      case 'user.deleted':
        await this.teamMemberService.softDeleteByClerkUserId(event.data.id);
        break;
      default:
        // Unhandled event types are acknowledged, not rejected — Clerk
        // sends many event types we don't act on (Doc 19 webhook conventions).
        break;
    }

    return { received: true };
  }

  private verifyAndParse(
    request: RawBodyRequest<Request>,
    headers: Record<string, string>,
  ): ClerkUserEvent {
    if (!request.rawBody) {
      throw new InvalidWebhookSignatureException('Missing raw request body');
    }

    const svixHeaders: Record<string, string> = {};
    for (const header of REQUIRED_SVIX_HEADERS) {
      const value = headers[header];
      if (!value) {
        throw new InvalidWebhookSignatureException(`Missing ${header} header`);
      }
      svixHeaders[header] = value;
    }

    const signingSecret = this.config.get<string>('CLERK_WEBHOOK_SIGNING_SECRET');
    if (!signingSecret) {
      throw new InvalidWebhookSignatureException('Webhook signing secret not configured');
    }

    const webhook = new Webhook(signingSecret);
    try {
      return webhook.verify(request.rawBody, svixHeaders) as ClerkUserEvent;
    } catch {
      throw new InvalidWebhookSignatureException();
    }
  }
}
