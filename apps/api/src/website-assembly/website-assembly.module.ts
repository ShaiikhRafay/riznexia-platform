import { Module } from '@nestjs/common';
import { LeadsModule } from '../leads/leads.module';
import { WebsiteAssemblyController } from './website-assembly.controller';
import { WebsiteAssemblyService } from './website-assembly.service';

// Module M8.4 — Website Assembly (Doc 21 M8 entry). Imports only
// LeadsModule — unlike ContentEngineModule, no BusinessModule dependency
// (assembleWebsite() never touches the raw Business record; see
// WebsiteAssemblyService's own doc comment) and no ThemeModule/AiModule
// dependency — assembleWebsite() is a pure function, not a registered
// provider.
@Module({
  imports: [LeadsModule],
  controllers: [WebsiteAssemblyController],
  providers: [WebsiteAssemblyService],
})
export class WebsiteAssemblyModule {}
