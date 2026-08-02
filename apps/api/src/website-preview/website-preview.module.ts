import { Module } from '@nestjs/common';
import { LeadsModule } from '../leads/leads.module';
import { WebsitePreviewController } from './website-preview.controller';
import { WebsitePreviewService } from './website-preview.service';

// Module M9 — Website Preview (Doc 21 M9 entry). Imports only
// LeadsModule — no BusinessModule (same reasoning as WebsiteAssemblyModule:
// businessName is read back out of the already-generated website, never
// from the raw Business record) and no ThemeModule/AiModule dependency —
// every M9 engine is a pure function, not a registered provider.
@Module({
  imports: [LeadsModule],
  controllers: [WebsitePreviewController],
  providers: [WebsitePreviewService],
})
export class WebsitePreviewModule {}
