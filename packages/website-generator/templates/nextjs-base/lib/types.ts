// Self-contained content types for the generated site — deliberately NOT
// imported from @riznexia/shared-types (the generated project has no
// workspace dependency on Riznexia's internal packages; it is a standalone
// Next.js app). Structurally mirrors ContentManifest's SourcedValue shapes
// (packages/shared-types/src/content-manifest.ts) by convention, not by
// import, so every value the sections render still carries its origin.
export interface SourcedText {
  value: string;
  source: string;
}

export interface SourcedTextList {
  value: string[];
  source: string;
}

export interface LinkValue {
  label?: string;
  targetComponentId?: string;
  url?: string;
}

export interface SourcedLink {
  value: LinkValue;
  source: string;
}

export interface SourcedLinkList {
  value: { label: string; targetComponentId: string }[];
  source: string;
}

export interface SourcedImageRef {
  value: { photoReference: string };
  source: string;
}

export type CtaStyle = 'solid-button' | 'outline-button' | 'floating-action' | 'banner-strip';
