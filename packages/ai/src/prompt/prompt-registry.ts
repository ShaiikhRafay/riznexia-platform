import * as businessAnalysisV1 from './business-analysis/v1.0';
import type { BusinessAnalysisPromptInput } from './business-analysis/v1.0';
import * as themeRecommendationV1 from './theme-recommendation/v1.0';
import type { ThemeRecommendationPromptInput } from './theme-recommendation/v1.0';

export interface ResolvedPrompt {
  promptName: string;
  promptVersion: string;
  promptHash: string;
  systemPrompt: string;
  userPrompt: string;
  buildRepairPrompt: (rawResponse: string, errors: string[]) => string;
}

// Theme recommendation (Module M7) has no repair-prompt ladder — it's a
// narrow single-attempt classification, not a creative generation task
// (D-046) — so this resolved shape omits buildRepairPrompt entirely rather
// than exposing a no-op.
export interface ResolvedClassificationPrompt {
  promptName: string;
  promptVersion: string;
  promptHash: string;
  systemPrompt: string;
  userPrompt: string;
}

// Module M6 (Req 1) — the registry always resolves a prompt name to its
// current version; callers never hardcode a version string. Bumping a
// template means pointing CURRENT at a new sibling module (v1.1.ts,
// v2.0.ts, ...), never editing v1.0.ts in place, so a historical row's
// promptVersion+promptHash stay reproducible against the exact template
// that produced it.
const CURRENT_BUSINESS_ANALYSIS_VERSION = businessAnalysisV1;
const CURRENT_THEME_RECOMMENDATION_VERSION = themeRecommendationV1;

export class PromptRegistry {
  resolveBusinessAnalysis(input: BusinessAnalysisPromptInput): ResolvedPrompt {
    const template = CURRENT_BUSINESS_ANALYSIS_VERSION;
    return {
      promptName: template.PROMPT_NAME,
      promptVersion: template.PROMPT_VERSION,
      promptHash: template.PROMPT_HASH,
      systemPrompt: template.buildSystemPrompt(),
      userPrompt: template.buildUserPrompt(input),
      buildRepairPrompt: template.buildRepairPrompt,
    };
  }

  resolveThemeRecommendation(input: ThemeRecommendationPromptInput): ResolvedClassificationPrompt {
    const template = CURRENT_THEME_RECOMMENDATION_VERSION;
    return {
      promptName: template.PROMPT_NAME,
      promptVersion: template.PROMPT_VERSION,
      promptHash: template.PROMPT_HASH,
      systemPrompt: template.buildSystemPrompt(),
      userPrompt: template.buildUserPrompt(input),
    };
  }
}
