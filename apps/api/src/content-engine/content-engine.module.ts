import { Module } from '@nestjs/common';
import { BusinessModule } from '../business/business.module';
import { LeadsModule } from '../leads/leads.module';
import { ContentBindingController } from './content-binding.controller';
import { ContentBindingService } from './content-binding.service';

// Module M8.3 — Content Binding (Doc 21 M8 entry). Imports BusinessModule
// (for the raw Business record content binding needs beyond the phase
// brief's stated four inputs — D-062) alongside LeadsModule; no
// ThemeModule/AiModule dependency — generateContentManifest() is a pure
// function, not a registered provider.
@Module({
  imports: [BusinessModule, LeadsModule],
  controllers: [ContentBindingController],
  providers: [ContentBindingService],
})
export class ContentEngineModule {}
