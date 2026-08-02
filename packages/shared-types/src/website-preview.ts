import { z } from 'zod';

// Module M9 (DECISIONS.md D-075+) — Website Preview. Read-only: this
// module never regenerates or modifies GeneratedWebsite (M8), it only
// inspects the already-assembled files. Three independent, independently
// versioned/cached artifacts — WebsitePreview, PreviewReport,
// PublishReadinessReport — each carries the same metadata envelope
// (founder's explicit requirement) so any one of them is self-describing
// without needing the others to exist.

export const DEVICE_PREVIEW_MODES = ['desktop', 'tablet', 'mobile'] as const;
export type DevicePreviewMode = (typeof DEVICE_PREVIEW_MODES)[number];

export const devicePreviewPresetSchema = z.object({
  mode: z.enum(DEVICE_PREVIEW_MODES),
  widthPx: z.number().int().positive(),
});
export type DevicePreviewPreset = z.infer<typeof devicePreviewPresetSchema>;

export const previewFileEntrySchema = z.object({
  path: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
});
export type PreviewFileEntry = z.infer<typeof previewFileEntrySchema>;

// Shared by all three persisted M9 artifacts (founder's explicit "every
// preview must store" requirement) — `previewVersion` is this specific
// artifact's own per-business counter (WebsitePreview/PreviewReport/
// PublishReadinessReport each have their own independent sequence, never
// overwritten); `generatedWebsiteVersion` denormalizes the upstream
// GeneratedWebsite.configVersion this artifact was computed against (the
// cache key — a stale value means the underlying website changed since);
// `validationVersion` versions the validator rule set/registry
// specifically (distinct from the module as a whole, since a future
// validator can be added without touching the Preview Engine's own
// logic); `generatedByModuleVersion` versions packages/website-preview
// as a whole.
export const previewMetadataSchema = z.object({
  previewVersion: z.number().int().positive(),
  generatedWebsiteVersion: z.number().int().positive(),
  validationVersion: z.string().min(1),
  generatedByModuleVersion: z.string().min(1),
  createdAt: z.string(),
});
export type PreviewMetadata = z.infer<typeof previewMetadataSchema>;

export const websitePreviewSchema = previewMetadataSchema.extend({
  id: z.string().uuid(),
  businessId: z.string().uuid(),
  generatedWebsiteId: z.string().uuid(),
  businessName: z.string().min(1),
  themeName: z.string().min(1),
  themeId: z.string().min(1),
  devicePresets: z.array(devicePreviewPresetSchema),
  files: z.array(previewFileEntrySchema),
});
export type WebsitePreview = z.infer<typeof websitePreviewSchema>;

// A closed taxonomy — same "deliberate schema change, not a silently
// accepted new string" discipline as every other closed enum in this
// codebase (SupportedComponentType, VisibilityCondition, ...). Future
// validators (Security/Legal/Cookie/Brand/Broken-Link, per the founder's
// forward-compatibility examples) each add their own new category value
// here when they're actually built — a one-line, explicit extension, not
// a change to any existing validator's implementation.
export const RULE_CATEGORIES = [
  'structural',
  'content',
  'seo',
  'accessibility',
  'performance',
] as const;
export type RuleCategory = (typeof RULE_CATEGORIES)[number];

export const RULE_STATUSES = ['pass', 'warning', 'error'] as const;
export type RuleStatus = (typeof RULE_STATUSES)[number];

export const RULE_SEVERITIES = ['info', 'low', 'medium', 'high', 'critical'] as const;
export type RuleSeverity = (typeof RULE_SEVERITIES)[number];

// Every field the founder's brief requires per validation rule.
// `documentationUrl` is nullable and always null this phase — no public
// docs site exists yet to link to; the field exists now so a future
// docs site doesn't require a schema change, only populating it.
export const validationRuleResultSchema = z.object({
  ruleId: z.string().min(1),
  ruleCategory: z.enum(RULE_CATEGORIES),
  ruleName: z.string().min(1),
  severity: z.enum(RULE_SEVERITIES),
  status: z.enum(RULE_STATUSES),
  message: z.string().min(1),
  recommendation: z.string().min(1).nullable(),
  documentationUrl: z.string().min(1).nullable(),
});
export type ValidationRuleResult = z.infer<typeof validationRuleResultSchema>;

export const previewReportSchema = previewMetadataSchema.extend({
  id: z.string().uuid(),
  businessId: z.string().uuid(),
  generatedWebsiteId: z.string().uuid(),
  rules: z.array(validationRuleResultSchema),
  validationTimestamp: z.string(),
});
export type PreviewReport = z.infer<typeof previewReportSchema>;

// Every category score explains itself (founder's explicit "must explain
// why points were deducted" requirement) — `deductions` lists exactly
// which rules cost how many points, never just a bare number.
export const scoreDeductionSchema = z.object({
  ruleId: z.string().min(1),
  ruleName: z.string().min(1),
  pointsDeducted: z.number().min(0),
  reason: z.string().min(1),
});
export type ScoreDeduction = z.infer<typeof scoreDeductionSchema>;

export const scoreBreakdownSchema = z.object({
  score: z.number().int().min(0).max(100),
  maxScore: z.literal(100),
  deductions: z.array(scoreDeductionSchema),
});
export type ScoreBreakdown = z.infer<typeof scoreBreakdownSchema>;

export const publishReadinessReportSchema = previewMetadataSchema.extend({
  id: z.string().uuid(),
  businessId: z.string().uuid(),
  generatedWebsiteId: z.string().uuid(),
  seoScore: scoreBreakdownSchema,
  accessibilityScore: scoreBreakdownSchema,
  performanceScore: scoreBreakdownSchema,
  contentCompletenessScore: scoreBreakdownSchema,
  structuralIntegrityScore: scoreBreakdownSchema,
  overallPublishScore: scoreBreakdownSchema,
});
export type PublishReadinessReport = z.infer<typeof publishReadinessReportSchema>;
