import { z } from 'zod';
import { businessAnalysisOutputSchema, type BusinessAnalysisOutput } from '@riznexia/shared-types';

// Module M6 (Req 5) — the raw AI response includes confidenceScore
// alongside the 19 brandBrief fields; the schema boundary between "goes in
// brandBrief" and "typed BusinessAnalysis.confidenceScore column" is drawn
// here, not in the prompt or the DB layer.
const aiResponseSchema = businessAnalysisOutputSchema.extend({
  confidenceScore: z.number().min(0).max(1),
});

export interface ValidatedAiResponse {
  brandBrief: BusinessAnalysisOutput;
  confidenceScore: number;
}

export type ValidationResult =
  { ok: true; data: ValidatedAiResponse } | { ok: false; errors: string[] };

// Strips a markdown code fence if the model wrapped its JSON in one despite
// the prompt's explicit instruction not to — a cheap normalization before
// parse, not a validation pass of its own.
function stripCodeFence(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced?.[1] ? fenced[1].trim() : trimmed;
}

// Module M6 (Req 5) — never throws. The runner decides what to do with a
// failure (repair-prompt retry, then FAILED); validation itself is a pure
// function so it's trivially unit-testable against fixture strings.
export class ResponseValidator {
  validate(rawText: string): ValidationResult {
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(stripCodeFence(rawText));
    } catch (error) {
      return { ok: false, errors: [`Response is not valid JSON: ${(error as Error).message}`] };
    }

    const result = aiResponseSchema.safeParse(parsedJson);
    if (!result.success) {
      return {
        ok: false,
        errors: result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`),
      };
    }

    const { confidenceScore, ...brandBrief } = result.data;
    return { ok: true, data: { brandBrief, confidenceScore } };
  }
}
