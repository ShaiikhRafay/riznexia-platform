import { describe, expect, it, vi } from 'vitest';
import { AiService } from './ai.service';
import { STANDARD_MODEL } from '../provider/model.constants';
import type {
  AiCompletionRequest,
  AiCompletionResult,
  AiTextProvider,
} from '../provider/ai-text-provider.interface';
import type { ThemeRecommendationPromptInput } from '../prompt/theme-recommendation/v1.0';

const INPUT: ThemeRecommendationPromptInput = {
  industry: 'Italian Restaurant',
  businessCategory: 'restaurant',
  primaryServices: ['Dine-in', 'Takeout'],
  targetAudience: ['Local families'],
  websiteSections: ['Hero', 'Menu'],
  registeredThemeIds: [
    'restaurant',
    'salon',
    'dental',
    'law-firm',
    'gym',
    'real-estate',
    'medical',
    'corporate',
  ],
};

function fakeCompletion(
  rawText: string,
  overrides: Partial<AiCompletionResult> = {},
): AiCompletionResult {
  return {
    rawText,
    promptTokens: 200,
    completionTokens: 50,
    model: STANDARD_MODEL,
    stopReason: 'end_turn',
    durationMs: 50,
    ...overrides,
  };
}

class FakeProvider implements AiTextProvider {
  readonly name = 'CLAUDE' as const;
  complete = vi.fn<(request: AiCompletionRequest) => Promise<AiCompletionResult>>();
}

describe('AiService.recommendThemeCategory', () => {
  it('returns a completed outcome for a well-formed response', async () => {
    const provider = new FakeProvider();
    provider.complete.mockResolvedValue(
      fakeCompletion(
        JSON.stringify({
          themeId: 'restaurant',
          confidence: 0.95,
          reasoning: 'Menu-focused business.',
        }),
      ),
    );
    const service = new AiService(provider);

    const outcome = await service.recommendThemeCategory(INPUT);

    expect(outcome.status).toBe('completed');
    if (outcome.status === 'completed') {
      expect(outcome.themeId).toBe('restaurant');
      expect(outcome.confidence).toBe(0.95);
    }
    expect(provider.complete).toHaveBeenCalledTimes(1);
    expect(provider.complete.mock.calls[0]![0].model).toBe(STANDARD_MODEL);
  });

  it('returns a failed outcome (never throws) when the response fails validation, with no repair-prompt retry', async () => {
    const provider = new FakeProvider();
    provider.complete.mockResolvedValue(fakeCompletion('not json at all'));
    const service = new AiService(provider);

    const outcome = await service.recommendThemeCategory(INPUT);

    expect(outcome.status).toBe('failed');
    // Exactly one call — no repair-prompt ladder for this lightweight task.
    expect(provider.complete).toHaveBeenCalledTimes(1);
  });

  it('returns a failed outcome (never throws) after transient retries are exhausted', async () => {
    vi.useFakeTimers();
    try {
      const provider = new FakeProvider();
      provider.complete.mockRejectedValue(new Error('network timeout'));
      const service = new AiService(provider);

      const outcomePromise = service.recommendThemeCategory(INPUT);
      await vi.runAllTimersAsync();
      const outcome = await outcomePromise;

      expect(outcome.status).toBe('failed');
      if (outcome.status === 'failed') {
        expect(outcome.reason).toContain('network timeout');
      }
      // 1 initial + 2 transient retries.
      expect(provider.complete).toHaveBeenCalledTimes(3);
    } finally {
      vi.useRealTimers();
    }
  });

  it('accepts "none" as a valid themeId when nothing fits', async () => {
    const provider = new FakeProvider();
    provider.complete.mockResolvedValue(
      fakeCompletion(
        JSON.stringify({ themeId: 'none', confidence: 0.1, reasoning: 'No clear industry match.' }),
      ),
    );
    const service = new AiService(provider);

    const outcome = await service.recommendThemeCategory(INPUT);

    expect(outcome.status).toBe('completed');
    if (outcome.status === 'completed') {
      expect(outcome.themeId).toBe('none');
    }
  });
});
