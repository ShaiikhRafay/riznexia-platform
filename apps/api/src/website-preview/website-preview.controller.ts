import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { PreviewReport, PublishReadinessReport, WebsitePreview } from '@riznexia/shared-types';
import { Audited } from '../common/decorators/audited.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { WebsitePreviewService } from './website-preview.service';

// GET /leads/:id/preview, /leads/:id/preview/validation,
// /leads/:id/preview/readiness — Doc 21 M9 entry. Every route is a GET
// (D-075 note: unlike M6-M8.4, there is no POST here — validation has no
// external cost to gate behind an explicit generate step, so a GET
// computes-and-caches itself, keyed to GeneratedWebsite.configVersion).
// All three require the dedicated `website:preview` permission (not
// `leads:read`, unlike M6-M8's own GETs) since, unlike those, this GET
// actually triggers real computation (reading/parsing the generated
// website, running validators) — the founder's own "future-proof for
// client approval / internal QA / review workflow" framing treats
// viewing a preview or its reports as the privileged action itself.
@Controller('leads/:id/preview')
export class WebsitePreviewController {
  constructor(private readonly websitePreviewService: WebsitePreviewService) {}

  @Get()
  @RequirePermissions('website:preview')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Audited({ action: 'website.preview_opened', entityType: 'Lead', entityIdParam: 'id' })
  async getPreview(@Param('id', ParseUUIDPipe) leadId: string): Promise<WebsitePreview> {
    return this.websitePreviewService.getPreview(leadId);
  }

  @Get('validation')
  @RequirePermissions('website:preview')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Audited({
    action: 'website.validation_report_generated',
    entityType: 'Lead',
    entityIdParam: 'id',
  })
  async getValidationReport(@Param('id', ParseUUIDPipe) leadId: string): Promise<PreviewReport> {
    return this.websitePreviewService.getValidationReport(leadId);
  }

  @Get('readiness')
  @RequirePermissions('website:preview')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Audited({
    action: 'website.readiness_report_generated',
    entityType: 'Lead',
    entityIdParam: 'id',
  })
  async getReadinessReport(
    @Param('id', ParseUUIDPipe) leadId: string,
  ): Promise<PublishReadinessReport> {
    return this.websitePreviewService.getReadinessReport(leadId);
  }
}
