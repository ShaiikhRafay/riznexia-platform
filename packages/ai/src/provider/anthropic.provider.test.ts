import { describe, expect, it, vi } from 'vitest';
import { AnthropicProvider } from './anthropic.provider';

const mockCreate = vi.fn();
vi.mock('@anthropic-ai/sdk', () => ({
  default: class MockAnthropic {
    messages = { create: mockCreate };
  },
}));

describe('AnthropicProvider', () => {
  it('has name CLAUDE', () => {
    const provider = new AnthropicProvider('test-key');
    expect(provider.name).toBe('CLAUDE');
  });

  it('maps a successful response to AiCompletionResult', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: '{"industry":"Restaurant"}' }],
      usage: { input_tokens: 500, output_tokens: 300 },
      model: 'claude-sonnet-5',
      stop_reason: 'end_turn',
    });

    const provider = new AnthropicProvider('test-key');
    const result = await provider.complete({
      systemPrompt: 'system',
      userPrompt: 'user',
      model: 'claude-sonnet-5',
      maxTokens: 4096,
      timeoutMs: 30_000,
    });

    expect(result.rawText).toBe('{"industry":"Restaurant"}');
    expect(result.promptTokens).toBe(500);
    expect(result.completionTokens).toBe(300);
    expect(result.model).toBe('claude-sonnet-5');
    expect(result.stopReason).toBe('end_turn');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('passes model/max_tokens/system/messages through to the SDK call', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: '{}' }],
      usage: { input_tokens: 1, output_tokens: 1 },
      model: 'claude-sonnet-5',
      stop_reason: 'end_turn',
    });

    const provider = new AnthropicProvider('test-key');
    await provider.complete({
      systemPrompt: 'sys-prompt',
      userPrompt: 'user-prompt',
      model: 'claude-opus-5',
      maxTokens: 8192,
      timeoutMs: 45_000,
    });

    expect(mockCreate).toHaveBeenCalledWith(
      {
        model: 'claude-opus-5',
        max_tokens: 8192,
        system: 'sys-prompt',
        messages: [{ role: 'user', content: 'user-prompt' }],
      },
      { timeout: 45_000 },
    );
  });

  it('returns an empty rawText when the response has no text block', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'tool_use', id: 'x', name: 'y', input: {} }],
      usage: { input_tokens: 1, output_tokens: 1 },
      model: 'claude-sonnet-5',
      stop_reason: 'tool_use',
    });

    const provider = new AnthropicProvider('test-key');
    const result = await provider.complete({
      systemPrompt: 'system',
      userPrompt: 'user',
      model: 'claude-sonnet-5',
      maxTokens: 4096,
      timeoutMs: 30_000,
    });

    expect(result.rawText).toBe('');
  });
});
