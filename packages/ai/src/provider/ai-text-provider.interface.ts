// Module M6 (DECISIONS.md D-037) — the AI provider abstraction, mirroring
// M5's LocationProvider precedent (apps/api/src/common/providers/
// location-provider.interface.ts): business logic (AiService, and
// everything above it) depends only on this interface, never on a
// vendor SDK directly. AnthropicProvider is the sole implementation;
// OpenAiProvider/GeminiProvider/DeepSeekProvider/LocalLlmProvider are named
// attachment points (AiProviderName enum, packages/db/prisma/schema.prisma)
// but not built — same treatment M5 gave YelpProvider/FacebookPlacesProvider.
export const AI_TEXT_PROVIDER = Symbol('AI_TEXT_PROVIDER');

export interface AiCompletionRequest {
  systemPrompt: string;
  userPrompt: string;
  maxTokens: number;
  model: string;
  /** Wall-clock timeout for this single call, in milliseconds. */
  timeoutMs: number;
}

export interface AiCompletionResult {
  rawText: string;
  promptTokens: number;
  completionTokens: number;
  model: string;
  stopReason: string;
  /** Measured by the provider adapter — cost tracking (Req 6). */
  durationMs: number;
}

export interface AiTextProvider {
  readonly name: 'CLAUDE' | 'OPENAI' | 'GEMINI' | 'DEEPSEEK' | 'LOCAL_LLM';
  complete(request: AiCompletionRequest): Promise<AiCompletionResult>;
}
