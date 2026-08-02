import { z } from 'zod';

// Module M8.4 (DECISIONS.md D-068+) — Website Assembly output. `files` is
// the entire generated Next.js project as a flat, path-sorted list — same
// "the whole value is read/written together" Json-blob convention as
// every other M6-M8 compound-structure column (no per-file querying, no
// separate object storage).
export const generatedWebsiteFileSchema = z.object({
  path: z.string().min(1),
  content: z.string(),
});
export type GeneratedWebsiteFile = z.infer<typeof generatedWebsiteFileSchema>;

export const generatedWebsiteSchema = z.object({
  id: z.string().uuid(),
  businessId: z.string().uuid(),
  businessAnalysisId: z.string().uuid(),
  themeConfigurationId: z.string().uuid(),
  layoutConfigurationId: z.string().uuid(),
  componentManifestId: z.string().uuid(),
  contentManifestId: z.string().uuid(),
  configVersion: z.number().int().positive(),
  assemblyEngineVersion: z.string().min(1),
  files: z.array(generatedWebsiteFileSchema),
  createdAt: z.string(),
});
export type GeneratedWebsite = z.infer<typeof generatedWebsiteSchema>;
