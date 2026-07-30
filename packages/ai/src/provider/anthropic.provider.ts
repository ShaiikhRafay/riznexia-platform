import Anthropic from '@anthropic-ai/sdk';
import type {
  AiCompletionRequest,
  AiCompletionResult,
  AiTextProvider,
} from './ai-text-provider.interface';

// Module M6 — the sole AiTextProvider implementation for this module.
// Business logic never imports this class directly; it depends on the
// AI_TEXT_PROVIDER token (same DI pattern as M5's GooglePlacesProvider).
export class AnthropicProvider implements AiTextProvider {
  readonly name = 'CLAUDE' as const;

  private readonly client: Anthropic;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async complete(request: AiCompletionRequest): Promise<AiCompletionResult> {
    const startedAt = Date.now();

    const response = await this.client.messages.create(
      {
        model: request.model,
        max_tokens: request.maxTokens,
        system: request.systemPrompt,
        messages: [{ role: 'user', content: request.userPrompt }],
      },
      { timeout: request.timeoutMs },
    );

    const textBlock = response.content.find((block) => block.type === 'text');

    return {
      rawText: textBlock?.type === 'text' ? textBlock.text : '',
      promptTokens: response.usage.input_tokens,
      completionTokens: response.usage.output_tokens,
      model: response.model,
      stopReason: response.stop_reason ?? 'unknown',
      durationMs: Date.now() - startedAt,
    };
  }
}
