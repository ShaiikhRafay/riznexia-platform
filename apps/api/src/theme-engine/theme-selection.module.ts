import { Module } from '@nestjs/common';
import { AiModule } from '../common/ai/ai.module';
import { ThemeModule } from '../common/theme/theme.module';
import { BusinessModule } from '../business/business.module';
import { LeadsModule } from '../leads/leads.module';
import { ThemeSelectionController } from './theme-selection.controller';
import { ThemeSelectionService } from './theme-selection.service';

// Module M7 — Theme Engine (Doc 21 M7 entry). Depends on ThemeModule for
// THEME_PROVIDER and AiModule for the AiService gateway — reuses both
// DI-wiring points rather than duplicating either.
@Module({
  imports: [BusinessModule, LeadsModule, ThemeModule, AiModule],
  controllers: [ThemeSelectionController],
  providers: [ThemeSelectionService],
})
export class ThemeSelectionModule {}
