import { ESCALATION_MODEL } from '@riznexia/ai';
import {
  CLAUDE_OPUS_INPUT_COST_PER_MTOK_USD,
  CLAUDE_OPUS_OUTPUT_COST_PER_MTOK_USD,
  CLAUDE_SONNET_INPUT_COST_PER_MTOK_USD,
  CLAUDE_SONNET_OUTPUT_COST_PER_MTOK_USD,
} from './cost.constants';

// Extracted from Module M6's BusinessAnalysisRunnerService (D-048) so
// Module M7's ThemeSelectionService can compute a real per-call AI cost
// from actual token counts the same way, without duplicating the
// model-tier-to-price-rate logic. Any caller of an AiTextProvider-backed
// call (M6's analyzeBusiness, M7's recommendThemeCategory, future
// agents) should use this rather than reimplementing pricing lookup.
export function computeActualAiCostUsd(
  model: string,
  promptTokens: number,
  completionTokens: number,
): number {
  const isEscalation = model === ESCALATION_MODEL;
  const inputRate = isEscalation
    ? CLAUDE_OPUS_INPUT_COST_PER_MTOK_USD
    : CLAUDE_SONNET_INPUT_COST_PER_MTOK_USD;
  const outputRate = isEscalation
    ? CLAUDE_OPUS_OUTPUT_COST_PER_MTOK_USD
    : CLAUDE_SONNET_OUTPUT_COST_PER_MTOK_USD;
  return (promptTokens * inputRate + completionTokens * outputRate) / 1_000_000;
}
