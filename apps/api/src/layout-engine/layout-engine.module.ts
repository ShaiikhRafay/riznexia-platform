import { Module } from '@nestjs/common';
import { LeadsModule } from '../leads/leads.module';
import { LayoutGenerationController } from './layout-generation.controller';
import { LayoutGenerationService } from './layout-generation.service';

// Module M8.1 — Layout Generator (Doc 21 M8 entry). No ThemeModule/AiModule
// dependency, unlike ThemeSelectionModule — generateLayout()
// (@riznexia/website-generator) is a pure function, not a DI-registered
// provider/AI gateway; PRISMA_CLIENT comes from the @Global() DatabaseModule.
@Module({
  imports: [LeadsModule],
  controllers: [LayoutGenerationController],
  providers: [LayoutGenerationService],
})
export class LayoutEngineModule {}
