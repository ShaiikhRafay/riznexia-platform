import { Module } from '@nestjs/common';
import { StaticThemeRegistry, THEME_PROVIDER } from '@riznexia/themes';

// Module M7 (DECISIONS.md D-044) — the single DI wiring point for the
// theme abstraction, mirroring M5's ProvidersModule/M6's AiModule.
// StaticThemeRegistry is the sole implementation, registered behind the
// THEME_PROVIDER token; ThemeSelectionModule imports this rather than
// instantiating StaticThemeRegistry itself.
@Module({
  providers: [{ provide: THEME_PROVIDER, useClass: StaticThemeRegistry }],
  exports: [THEME_PROVIDER],
})
export class ThemeModule {}
