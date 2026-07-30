import { z } from 'zod';

// Module M7 — deliberately permissive on themeId (z.string(), not a
// closed enum): the caller (packages/themes' rule engine) is the actual
// authority on which ids are real and cross-checks against the live
// registry — this validator only confirms the AI's response is
// well-formed JSON with the right shape, not that the id it named exists.
const themeRecommendationResponseSchema = z.object({
  themeId: z.string().min(1),
  confidence: z.number().min(0).max(1),
  reasoning: z.string(),
});

export interface ThemeRecommendation {
  themeId: string;
  confidence: number;
  reasoning: string;
}

export type ThemeRecommendationValidationResult =
  { ok: true; data: ThemeRecommendation } | { ok: false; errors: string[] };

function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced?.[1] ? fenced[1].trim() : trimmed;
}

export class ThemeRecommendationValidator {
  validate(rawText: string): ThemeRecommendationValidationResult {
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(stripCodeFence(rawText));
    } catch (error) {
      return { ok: false, errors: [`Response is not valid JSON: ${(error as Error).message}`] };
    }

    const result = themeRecommendationResponseSchema.safeParse(parsedJson);
    if (!result.success) {
      return {
        ok: false,
        errors: result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
      };
    }

    return { ok: true, data: result.data };
  }
}
