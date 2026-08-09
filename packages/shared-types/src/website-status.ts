import { z } from 'zod';

// Module M10 (DECISIONS.md D-088) — computed, never persisted (founder's
// Decision 8: "Website Status remains computed. Never duplicate M6-M9
// data."). A different concept from `Business.websiteStatus`/
// `WebsiteStatus`/`WEBSITE_STATUSES` (M1/M5, `lead.ts` — whether this
// prospect already has a website of their own out in the world); this
// rollup is about where *Riznexia's own* generation pipeline stands for
// them. Named distinctly (`WebsiteGenerationStatus`, not `WebsiteStatus`)
// specifically to avoid colliding with — or being confused with — that
// unrelated M1/M5 field.
export const WEBSITE_GENERATION_STAGES = [
  'not_started',
  'analyzed',
  'theme_selected',
  'layout_generated',
  'components_generated',
  'content_bound',
  'generated',
  'preview_ready',
] as const;
export type WebsiteGenerationStage = (typeof WEBSITE_GENERATION_STAGES)[number];

export const websiteGenerationStatusSchema = z.object({
  leadId: z.string().uuid(),
  stage: z.enum(WEBSITE_GENERATION_STAGES),
  hasAnalysis: z.boolean(),
  hasTheme: z.boolean(),
  hasLayout: z.boolean(),
  hasComponents: z.boolean(),
  hasContent: z.boolean(),
  hasGeneratedWebsite: z.boolean(),
  generatedWebsiteVersion: z.number().int().positive().nullable(),
  hasPreview: z.boolean(),
  publishReadinessScore: z.number().int().min(0).max(100).nullable(),
});
export type WebsiteGenerationStatus = z.infer<typeof websiteGenerationStatusSchema>;
