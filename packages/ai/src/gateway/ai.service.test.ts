import { describe, expect, it, vi } from 'vitest';
import { AiService, type AiServiceEvent } from './ai.service';
import { ESCALATION_MODEL, STANDARD_MODEL } from '../provider/model.constants';
import type {
  AiCompletionRequest,
  AiCompletionResult,
  AiTextProvider,
} from '../provider/ai-text-provider.interface';
import type { BusinessAnalysisPromptInput } from '../prompt/business-analysis/v1.0';

function validJson(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    businessSummary: 'A family-owned diner.',
    industry: 'Restaurant',
    targetAudience: ['Local families'],
    brandPersonality: ['Warm'],
    toneOfVoice: 'Friendly',
    primaryServices: ['Dine-in'],
    secondaryServices: [],
    uniqueSellingPoints: ['Family recipes since 1985'],
    colorPalette: {
      primary: '#8B4513',
      secondary: '#F5DEB3',
      accent: '#FF6347',
      background: '#FFF8DC',
      text: '#2F1B0C',
    },
    typography: { heading: 'Georgia', body: 'Helvetica', accent: 'Pacifico' },
    layoutStyle: 'Warm and inviting',
    websiteSections: ['Hero', 'Menu'],
    seoKeywords: ['diner near me'],
    localSeoSuggestions: [],
    ctaRecommendations: ['Order Online'],
    trustSignals: [],
    socialProofSuggestions: [],
    imageRecommendations: [],
    contentRecommendations: ['Highlight family history'],
    confidenceScore: 0.8,
    ...overrides,
  });
}

const INPUT: BusinessAnalysisPromptInput = {
  businessName: "Joe's Diner",
  category: 'Restaurant',
  city: 'Karachi',
  address: '123 Main St',
  phone: '+92-300-0000000',
  rating: 4.5,
  reviewCount: 120,
  openingHours: null,
  photos: null,
  websiteStatus: 'none',
  googleBusinessUrl: null,
  placesData: {},
};

function fakeCompletion(overrides: Partial<AiCompletionResult> = {}): AiCompletionResult {
  return {
    rawText: validJson(),
    promptTokens: 500,
    completionTokens: 300,
    model: STANDARD_MODEL,
    stopReason: 'end_turn',
    durationMs: 100,
    ...overrides,
  };
}

class FakeProvider implements AiTextProvider {
  readonly name = 'CLAUDE' as const;
  complete = vi.fn<(request: AiCompletionRequest) => Promise<AiCompletionResult>>();
}

describe('AiService.analyzeBusiness', () => {
  it('returns completed on first-attempt success, on the standard model', async () => {
    const provider = new FakeProvider();
    provider.complete.mockResolvedValue(fakeCompletion());
    const service = new AiService(provider);

    const outcome = await service.analyzeBusiness(INPUT);

    expect(outcome.status).toBe('completed');
    expect(provider.complete).toHaveBeenCalledTimes(1);
    expect(provider.complete.mock.calls[0]![0].model).toBe(STANDARD_MODEL);
    if (outcome.status === 'completed') {
      expect(outcome.brandBrief.industry).toBe('Restaurant');
      expect(outcome.confidenceScore).toBe(0.8);
    }
    expect(outcome.promptTokens).toBe(500);
    expect(outcome.completionTokens).toBe(300);
    expect(outcome.totalTokens).toBe(800);
  });

  it('recovers via a same-model repair-prompt retry on the second attempt', async () => {
    const provider = new FakeProvider();
    provider.complete
      .mockResolvedValueOnce(fakeCompletion({ rawText: 'not json at all' }))
      .mockResolvedValueOnce(fakeCompletion({ rawText: validJson() }));
    const service = new AiService(provider);

    const outcome = await service.analyzeBusiness(INPUT);

    expect(outcome.status).toBe('completed');
    expect(provider.complete).toHaveBeenCalledTimes(2);
    expect(provider.complete.mock.calls[1]![0].model).toBe(STANDARD_MODEL);
    // Repair attempt's prompt must reference the prior invalid response.
    expect(provider.complete.mock.calls[1]![0].userPrompt).toContain('not json at all');
    // Tokens are summed across both attempts.
    expect(outcome.totalTokens).toBe(1600);
  });

  it('escalates to the stronger model on the third attempt after two validation failures', async () => {
    const provider = new FakeProvider();
    provider.complete
      .mockResolvedValueOnce(fakeCompletion({ rawText: 'still not json' }))
      .mockResolvedValueOnce(fakeCompletion({ rawText: 'still not json either' }))
      .mockResolvedValueOnce(fakeCompletion({ rawText: validJson(), model: ESCALATION_MODEL }));
    const service = new AiService(provider);

    const outcome = await service.analyzeBusiness(INPUT);

    expect(outcome.status).toBe('completed');
    expect(provider.complete).toHaveBeenCalledTimes(3);
    expect(provider.complete.mock.calls[2]![0].model).toBe(ESCALATION_MODEL);
    expect(outcome.aiModel).toBe(ESCALATION_MODEL);
  });

  it('returns failed with the last raw response and errors when all 3 attempts fail validation', async () => {
    const provider = new FakeProvider();
    provider.complete.mockResolvedValue(fakeCompletion({ rawText: 'never valid json' }));
    const service = new AiService(provider);

    const outcome = await service.analyzeBusiness(INPUT);

    expect(outcome.status).toBe('failed');
    expect(provider.complete).toHaveBeenCalledTimes(3);
    if (outcome.status === 'failed') {
      expect(outcome.rawResponse).toBe('never valid json');
      expect(outcome.validationErrors.length).toBeGreaterThan(0);
    }
  });

  it('emits retry_attempt, validation_failure, and repair_prompt_sent events in order', async () => {
    const provider = new FakeProvider();
    provider.complete
      .mockResolvedValueOnce(fakeCompletion({ rawText: 'bad' }))
      .mockResolvedValueOnce(fakeCompletion({ rawText: validJson() }));
    const service = new AiService(provider);

    const events: AiServiceEvent[] = [];
    await service.analyzeBusiness(INPUT, { onEvent: (e) => events.push(e) });

    expect(events.map((e) => e.type)).toEqual([
      'retry_attempt',
      'validation_failure',
      'repair_prompt_sent',
      'retry_attempt',
    ]);
  });

  it('propagates a transient provider error after exhausting transport retries', async () => {
    vi.useFakeTimers();
    try {
      const provider = new FakeProvider();
      provider.complete.mockRejectedValue(new Error('network timeout'));
      const service = new AiService(provider);

      const outcomePromise = service.analyzeBusiness(INPUT);
      const assertion = expect(outcomePromise).rejects.toThrow('network timeout');
      await vi.runAllTimersAsync();
      await assertion;

      // 1 initial + 2 transient retries, all on attempt 1 — never reaches attempt 2.
      expect(provider.complete).toHaveBeenCalledTimes(3);
    } finally {
      vi.useRealTimers();
    }
  });
});
