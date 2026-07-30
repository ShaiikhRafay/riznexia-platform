import { z } from 'zod';

// Module M6 (DECISIONS.md D-037+). Same Prisma-uppercase / API-lowercase
// split used throughout (DiscoveryJobStatus, PlaceSyncJobStatus).
export const ANALYSIS_STATUSES = ['pending', 'completed', 'failed'] as const;
export type AnalysisStatus = (typeof ANALYSIS_STATUSES)[number];

// Every provider named in the M6 brief (Claude/OpenAI/Gemini/DeepSeek/Local
// LLM), not just the one implemented today — mirrors
// LOCATION_SOURCE_PROVIDERS' (M5) forward-declaration rationale.
export const AI_PROVIDERS = ['claude', 'openai', 'gemini', 'deepseek', 'local_llm'] as const;
export type AiProvider = (typeof AI_PROVIDERS)[number];

// The 19-field structured output (Module M6 brief, §Outputs) that M7 (Theme
// Engine) and M8 (Website Generator) will consume from `brandBrief`. Every
// field is required — a partial or missing field means the AI response
// failed validation and the analysis is marked FAILED (Doc 21 M6 entry,
// Req 5: never persist invalid structured data).
export const colorPaletteSchema = z.object({
  primary: z.string().min(1),
  secondary: z.string().min(1),
  accent: z.string().min(1),
  background: z.string().min(1),
  text: z.string().min(1),
});
export type ColorPalette = z.infer<typeof colorPaletteSchema>;

export const typographyRecommendationSchema = z.object({
  heading: z.string().min(1),
  body: z.string().min(1),
  accent: z.string().min(1),
});
export type TypographyRecommendation = z.infer<typeof typographyRecommendationSchema>;

export const businessAnalysisOutputSchema = z.object({
  businessSummary: z.string().min(1),
  industry: z.string().min(1),
  targetAudience: z.array(z.string().min(1)).min(1),
  brandPersonality: z.array(z.string().min(1)).min(1),
  toneOfVoice: z.string().min(1),
  primaryServices: z.array(z.string().min(1)).min(1),
  secondaryServices: z.array(z.string().min(1)),
  uniqueSellingPoints: z.array(z.string().min(1)).min(1),
  colorPalette: colorPaletteSchema,
  typography: typographyRecommendationSchema,
  layoutStyle: z.string().min(1),
  websiteSections: z.array(z.string().min(1)).min(1),
  seoKeywords: z.array(z.string().min(1)).min(1),
  localSeoSuggestions: z.array(z.string().min(1)),
  ctaRecommendations: z.array(z.string().min(1)).min(1),
  trustSignals: z.array(z.string().min(1)),
  socialProofSuggestions: z.array(z.string().min(1)),
  imageRecommendations: z.array(z.string().min(1)),
  contentRecommendations: z.array(z.string().min(1)).min(1),
});
export type BusinessAnalysisOutput = z.infer<typeof businessAnalysisOutputSchema>;

// Doc 19's BusinessDetail.analysis shape (Module M6 entry), extended with
// M6's typed columns — the API response for GET /leads/{id}/business's
// nested `analysis` and for GET /business-analyses/:id.
export const businessAnalysisSchema = z.object({
  id: z.string().uuid(),
  businessId: z.string().uuid(),
  analysisVersion: z.number().int().positive(),
  promptName: z.string(),
  promptVersion: z.string(),
  aiProvider: z.enum(AI_PROVIDERS),
  aiModel: z.string(),
  status: z.enum(ANALYSIS_STATUSES),
  brandBrief: businessAnalysisOutputSchema.nullable(),
  confidenceScore: z.number().min(0).max(1).nullable(),
  validationErrors: z.array(z.string()).nullable(),
  executionTimeMs: z.number().int().nonnegative().nullable(),
  completedAt: z.string().nullable(),
  promptTokens: z.number().int().nonnegative().nullable(),
  completionTokens: z.number().int().nonnegative().nullable(),
  totalTokens: z.number().int().nonnegative().nullable(),
  estimatedCost: z.number().nonnegative().nullable(),
  createdAt: z.string(),
});
export type BusinessAnalysis = z.infer<typeof businessAnalysisSchema>;
