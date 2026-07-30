import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AI_TEXT_PROVIDER, AiService, AnthropicProvider } from '@riznexia/ai';

// Module M6 (DECISIONS.md D-037) — the single DI wiring point for the AI
// provider abstraction, mirroring M5's ProvidersModule: AnthropicProvider
// is the sole implementation, registered behind the AI_TEXT_PROVIDER token.
// Both AI_TEXT_PROVIDER and AiService are exported — BusinessAnalysisModule
// consumes AiService directly (the gateway), not the raw provider token.
@Module({
  imports: [ConfigModule],
  providers: [
    {
      // Same tolerant-at-boot convention as PlacesAdapter's
      // GOOGLE_PLACES_API_KEY (`.get()`, not `.getOrThrow()`): a missing
      // key doesn't crash app startup (or every test that boots AppModule
      // without an AI-related env var), it surfaces as a real auth error
      // from the Anthropic SDK the first time a call is actually attempted.
      provide: AI_TEXT_PROVIDER,
      useFactory: (config: ConfigService) =>
        new AnthropicProvider(config.get<string>('ANTHROPIC_API_KEY') ?? ''),
      inject: [ConfigService],
    },
    {
      provide: AiService,
      useFactory: (provider: AnthropicProvider) => new AiService(provider),
      inject: [AI_TEXT_PROVIDER],
    },
  ],
  exports: [AI_TEXT_PROVIDER, AiService],
})
export class AiModule {}
