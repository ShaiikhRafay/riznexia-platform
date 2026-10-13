import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { z } from 'zod';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { OutreachService, type OutreachView } from './outreach.service';

const draftSchema = z.object({
  language: z.enum(['en', 'roman_ur']),
  channel: z.enum(['whatsapp', 'email']).default('whatsapp'),
  offer: z.string().trim().max(500).optional().nullable(),
  senderName: z.string().trim().max(80).optional().nullable(),
});
type DraftBody = z.infer<typeof draftSchema>;

// GET  /leads/:id/outreach        contact info + best live URL + share links
// POST /leads/:id/proposal-draft  EN / Roman Urdu draft (not persisted; the UI
//                                 saves the edited text via POST /leads/:id/proposals)
@Controller('leads/:id')
export class OutreachController {
  constructor(private readonly outreach: OutreachService) {}

  @Get('outreach')
  @RequirePermissions('leads:read')
  get(@Param('id', ParseUUIDPipe) leadId: string): Promise<OutreachView> {
    return this.outreach.get(leadId);
  }

  @Post('proposal-draft')
  @RequirePermissions('crm:manage')
  draft(
    @Param('id', ParseUUIDPipe) leadId: string,
    @Body(new ZodValidationPipe(draftSchema)) body: DraftBody,
  ) {
    return this.outreach.draft(leadId, body, body.senderName ?? null);
  }
}
