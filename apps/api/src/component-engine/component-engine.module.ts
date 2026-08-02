import { Module } from '@nestjs/common';
import { LeadsModule } from '../leads/leads.module';
import { ComponentGenerationController } from './component-generation.controller';
import { ComponentGenerationService } from './component-generation.service';

// Module M8.2 — Component Generator (Doc 21 M8 entry). No ThemeModule/
// AiModule dependency — generateComponentManifest() (@riznexia/website-generator)
// is a pure function, not a DI-registered provider; PRISMA_CLIENT comes
// from the @Global() DatabaseModule, same pattern as LayoutEngineModule.
@Module({
  imports: [LeadsModule],
  controllers: [ComponentGenerationController],
  providers: [ComponentGenerationService],
})
export class ComponentEngineModule {}
