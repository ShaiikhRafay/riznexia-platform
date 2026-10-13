export * from './layout/layout-generator';
export * from './layout/layout-validator';
export * from './component/component-tokens';
export * from './component/component-type-definitions';
export * from './component/component-generator';
export * from './component/component-validator';
export * from './content/content-binding-rules';
export * from './content/seo-binder';
export * from './content/content-generator';
export * from './content/content-validator';
export * from './assembly/ts-ast-helpers';
export * from './assembly/component-template-registry';
export * from './assembly/component-var-names';
export * from './assembly/component-props-mapper';
export * from './assembly/jsonld-mapper';
export * from './assembly/site-data-generator';
export * from './assembly/page-ast-generator';
export * from './assembly/theme-tokens-css-generator';
export * from './assembly/seo-files-generator';
export * from './assembly/package-json-generator';
export * from './assembly/static-template-loader';
export * from './assembly/website-assembler';
export * from './assembly/website-validator';
// BRIEF.md hand-off (docs/36-brief-handoff.md) — selective exports so the
// brief module's small helpers (slugify, whatsappLink, ...) never collide
// with the generic names used elsewhere in this package.
export { BRIEF_ENGINE_VERSION, generateBrief } from './brief/brief-generator';
export type { BriefInput, GeneratedBrief } from './brief/brief-generator';
export { DESIGN_DIRECTIONS, designDirectionFor } from './brief/design-directions';
export type { DesignDirection, SignatureSection } from './brief/design-directions';
