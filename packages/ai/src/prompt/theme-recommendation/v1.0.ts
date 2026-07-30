import { createHash } from 'node:crypto';

// Module M7 — versioned prompt template for the Theme Engine's "AI
// recommends" step (DECISIONS.md D-046). Deliberately a narrow
// classification task, not a creative one: given the business signals
// M6 already produced, pick the single best-fitting theme category from a
// closed, explicitly-provided list — never invent a category, never touch
// brand-identity fields (D-045). Rules (packages/themes) treat this as one
// input signal to blend into the industry-compatibility score, never as
// the final decision.
export const PROMPT_NAME = 'theme_recommendation';
export const PROMPT_VERSION = 'v1.0';

export interface ThemeRecommendationPromptInput {
  industry: string;
  businessCategory: string;
  primaryServices: string[];
  targetAudience: string[];
  websiteSections: string[];
  /** The closed set of valid theme ids — the AI must pick from this list or return "none". */
  registeredThemeIds: string[];
}

const SYSTEM_PROMPT = `You classify a business into exactly one website theme category from a fixed, closed list. You are not designing anything and you are not writing brand copy — a separate system already produced this business's brand identity; your only job is picking the single best-fitting category id from the list provided.

Ground rules:
- You MUST choose a themeId from the exact list given in <registered_themes> below, or the literal string "none" if nothing fits reasonably.
- Never invent a category id that isn't in the list.
- Base your choice only on the structured signals in <business_signals> — never invent facts.
- Respond with a single JSON object matching the required schema exactly. No prose before or after the JSON, no markdown code fences.`;

function renderInputBlock(input: ThemeRecommendationPromptInput): string {
  return [
    '<business_signals>',
    `Industry: ${input.industry}`,
    `Business category: ${input.businessCategory}`,
    `Primary services: ${input.primaryServices.join(', ') || 'not provided'}`,
    `Target audience: ${input.targetAudience.join(', ') || 'not provided'}`,
    `Requested website sections: ${input.websiteSections.join(', ') || 'not provided'}`,
    '</business_signals>',
    '<registered_themes>',
    input.registeredThemeIds.join(', '),
    '</registered_themes>',
  ].join('\n');
}

const RESPONSE_SCHEMA_INSTRUCTIONS = `Return a JSON object with exactly these fields:
{
  "themeId": string,   // one id from <registered_themes>, or "none"
  "confidence": number, // 0.0 to 1.0
  "reasoning": string   // one sentence
}`;

export function buildSystemPrompt(): string {
  return SYSTEM_PROMPT;
}

export function buildUserPrompt(input: ThemeRecommendationPromptInput): string {
  return [
    'Classify the following business into the best-fitting theme category.',
    '',
    renderInputBlock(input),
    '',
    RESPONSE_SCHEMA_INSTRUCTIONS,
  ].join('\n');
}

export const PROMPT_HASH = createHash('sha256')
  .update(SYSTEM_PROMPT + RESPONSE_SCHEMA_INSTRUCTIONS)
  .digest('hex');
