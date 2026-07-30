import type { BusinessAnalysisOutput } from '@riznexia/shared-types';
import type { AiTextProvider } from '../provider/ai-text-provider.interface';
import {
  DEFAULT_MAX_TOKENS,
  DEFAULT_TIMEOUT_MS,
  ESCALATION_MODEL,
  STANDARD_MODEL,
} from '../provider/model.constants';
import { PromptRegistry } from '../prompt/prompt-registry';
import type { BusinessAnalysisPromptInput } from '../prompt/business-analysis/v1.0';
import type { ThemeRecommendationPromptInput } from '../prompt/theme-recommendation/v1.0';
import { ResponseValidator } from '../validator/response-validator';
import { ThemeRecommendationValidator } from '../validator/theme-recommendation-validator';
import { withExponentialBackoff } from '../utils/retry';

// Transient-failure retry (Req 7): 2 retries, exponential backoff
// (1s, 2s) — wraps each individual provider call. Kept strictly separate
// from the validation-repair ladder below (Doc 20 §1: "transport retries
// are separate from quality retries").
const TRANSIENT_RETRIES = 2;
const TRANSIENT_BASE_DELAY_MS = 1000;

export interface AnalyzeOptions {
  onEvent?: (event: AiServiceEvent) => void;
}

// Structured logging hook (Req 8) — AiService is a plain class with no
// framework dependency, so it can't inject a NestJS Logger; the caller
// (BusinessAnalysisRunnerService) passes a callback that forwards these to
// its own Logger with businessId/analysisId context.
export type AiServiceEvent =
  | { type: 'validation_failure'; attempt: number; errors: string[] }
  | { type: 'repair_prompt_sent'; attempt: number; model: string }
  | { type: 'provider_error'; attempt: number; model: string; error: string }
  | { type: 'retry_attempt'; attempt: number; model: string };

export interface AiAnalysisResult {
  promptName: string;
  promptVersion: string;
  promptHash: string;
  aiProvider: 'CLAUDE' | 'OPENAI' | 'GEMINI' | 'DEEPSEEK' | 'LOCAL_LLM';
  aiModel: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  executionTimeMs: number;
}

export type AiAnalysisOutcome =
  | (AiAnalysisResult & {
      status: 'completed';
      brandBrief: BusinessAnalysisOutput;
      confidenceScore: number;
    })
  | (AiAnalysisResult & { status: 'failed'; rawResponse: string; validationErrors: string[] });

// Module M7 — the "AI recommends" half of "AI recommends, rules validate"
// (D-046). Deliberately resilient by contract: this never throws and
// never retries beyond transient transport failures — no repair-prompt
// ladder, no escalation. A `failed` outcome means the caller (the theme
// rule engine) proceeds without an AI signal, not that theme selection
// itself fails; rules alone are always sufficient to produce a result.
export type ThemeRecommendationOutcome =
  | {
      status: 'completed';
      themeId: string;
      confidence: number;
      reasoning: string;
      aiProvider: 'CLAUDE' | 'OPENAI' | 'GEMINI' | 'DEEPSEEK' | 'LOCAL_LLM';
      aiModel: string;
      promptTokens: number;
      completionTokens: number;
    }
  | { status: 'failed'; reason: string };

// Module M6 — the single entry point every agent goes through (Doc 16 §7's
// AiService Gateway), mirrored here as: PromptRegistry (render) →
// AiTextProvider (call, via the injected abstraction — never a vendor SDK
// directly) → ResponseValidator (validate) → repair-prompt retry ladder →
// escalation. Callers own cost charging (CostService.charge) and
// persistence — this class is framework- and Prisma-free so packages/ai
// stays usable from M7/M8 without an apps/api dependency.
export class AiService {
  private readonly promptRegistry = new PromptRegistry();
  private readonly validator = new ResponseValidator();
  private readonly themeRecommendationValidator = new ThemeRecommendationValidator();

  constructor(private readonly provider: AiTextProvider) {}

  async analyzeBusiness(
    input: BusinessAnalysisPromptInput,
    options: AnalyzeOptions = {},
  ): Promise<AiAnalysisOutcome> {
    const startedAt = Date.now();
    const prompt = this.promptRegistry.resolveBusinessAnalysis(input);

    let promptTokens = 0;
    let completionTokens = 0;
    let userPrompt = prompt.userPrompt;
    let model = STANDARD_MODEL;
    let lastRawText = '';
    let lastErrors: string[] = [];

    // Doc 20 §6 / founder's explicit retry ladder: initial attempt (1) →
    // 1x same-model repair-prompt retry (2) → 1x escalation to a stronger
    // model, also with a repair prompt (3) → FAILED. Max 3 total attempts.
    const attempts: Array<{ model: string; buildPrompt: () => string }> = [
      { model: STANDARD_MODEL, buildPrompt: () => userPrompt },
      {
        model: STANDARD_MODEL,
        buildPrompt: () => prompt.buildRepairPrompt(lastRawText, lastErrors),
      },
      {
        model: ESCALATION_MODEL,
        buildPrompt: () => prompt.buildRepairPrompt(lastRawText, lastErrors),
      },
    ];

    for (let attemptIndex = 0; attemptIndex < attempts.length; attemptIndex += 1) {
      const attemptNumber = attemptIndex + 1;
      const currentAttempt = attempts[attemptIndex]!;
      model = currentAttempt.model;
      userPrompt = currentAttempt.buildPrompt();

      if (attemptIndex > 0) {
        options.onEvent?.({ type: 'repair_prompt_sent', attempt: attemptNumber, model });
      }

      let completion;
      try {
        completion = await withExponentialBackoff(
          () => {
            options.onEvent?.({ type: 'retry_attempt', attempt: attemptNumber, model });
            return this.provider.complete({
              systemPrompt: prompt.systemPrompt,
              userPrompt,
              model,
              maxTokens: DEFAULT_MAX_TOKENS,
              timeoutMs: DEFAULT_TIMEOUT_MS,
            });
          },
          { retries: TRANSIENT_RETRIES, baseDelayMs: TRANSIENT_BASE_DELAY_MS },
        );
      } catch (error) {
        options.onEvent?.({
          type: 'provider_error',
          attempt: attemptNumber,
          model,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }

      promptTokens += completion.promptTokens;
      completionTokens += completion.completionTokens;
      lastRawText = completion.rawText;

      const validation = this.validator.validate(completion.rawText);
      if (validation.ok) {
        return {
          status: 'completed',
          brandBrief: validation.data.brandBrief,
          confidenceScore: validation.data.confidenceScore,
          promptName: prompt.promptName,
          promptVersion: prompt.promptVersion,
          promptHash: prompt.promptHash,
          aiProvider: this.provider.name,
          aiModel: completion.model,
          promptTokens,
          completionTokens,
          totalTokens: promptTokens + completionTokens,
          executionTimeMs: Date.now() - startedAt,
        };
      }

      lastErrors = validation.errors;
      options.onEvent?.({
        type: 'validation_failure',
        attempt: attemptNumber,
        errors: validation.errors,
      });
    }

    return {
      status: 'failed',
      rawResponse: lastRawText,
      validationErrors: lastErrors,
      promptName: prompt.promptName,
      promptVersion: prompt.promptVersion,
      promptHash: prompt.promptHash,
      aiProvider: this.provider.name,
      aiModel: model,
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      executionTimeMs: Date.now() - startedAt,
    };
  }

  // Module M7 — the "AI recommends" step. Single attempt (transient-retried
  // only, no repair-prompt ladder or model escalation — a narrow
  // classification task doesn't warrant M6's full ladder) and never
  // throws: any provider or validation failure resolves to
  // `{status: 'failed'}` so the caller's rule engine can proceed without
  // an AI signal rather than propagating an exception.
  async recommendThemeCategory(
    input: ThemeRecommendationPromptInput,
  ): Promise<ThemeRecommendationOutcome> {
    const prompt = this.promptRegistry.resolveThemeRecommendation(input);

    let completion;
    try {
      completion = await withExponentialBackoff(
        () =>
          this.provider.complete({
            systemPrompt: prompt.systemPrompt,
            userPrompt: prompt.userPrompt,
            model: STANDARD_MODEL,
            maxTokens: DEFAULT_MAX_TOKENS,
            timeoutMs: DEFAULT_TIMEOUT_MS,
          }),
        { retries: TRANSIENT_RETRIES, baseDelayMs: TRANSIENT_BASE_DELAY_MS },
      );
    } catch (error) {
      return { status: 'failed', reason: error instanceof Error ? error.message : String(error) };
    }

    const validation = this.themeRecommendationValidator.validate(completion.rawText);
    if (!validation.ok) {
      return { status: 'failed', reason: validation.errors.join('; ') };
    }

    return {
      status: 'completed',
      themeId: validation.data.themeId,
      confidence: validation.data.confidence,
      reasoning: validation.data.reasoning,
      aiProvider: this.provider.name,
      aiModel: completion.model,
      promptTokens: completion.promptTokens,
      completionTokens: completion.completionTokens,
    };
  }
}
