// Versions packages/website-preview as a whole (the "generatedByModuleVersion"
// field the founder requires on every persisted M9 artifact) — distinct
// from PREVIEW_ENGINE_VERSION/VALIDATION_ENGINE_VERSION/
// PUBLISH_READINESS_ENGINE_VERSION, which each version their own specific
// sub-engine independently (a future validator addition, for instance,
// might bump VALIDATION_ENGINE_VERSION without this module version
// needing to change).
export const WEBSITE_PREVIEW_MODULE_VERSION = 'v1.0';
