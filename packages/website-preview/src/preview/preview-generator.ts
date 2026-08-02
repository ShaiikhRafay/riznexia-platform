import type {
  GeneratedWebsite,
  GeneratedWebsiteFile,
  PreviewFileEntry,
  ThemeConfiguration,
} from '@riznexia/shared-types';
import { extractJsonLdPayloads, findFile, parseSourceFile } from '../ast-inspect-helpers';
import { DEVICE_PRESETS } from './device-presets';

// Versions this specific engine's own logic (which fields it derives,
// how businessName is extracted) — distinct from VALIDATION_ENGINE_VERSION.
export const PREVIEW_ENGINE_VERSION = 'v1.0';

export interface WebsitePreviewContent {
  businessName: string;
  themeName: string;
  themeId: string;
  devicePresets: typeof DEVICE_PRESETS;
  files: PreviewFileEntry[];
}

/**
 * Read-only: builds a file-manifest/summary view of an already-assembled
 * GeneratedWebsite. Never inspects LayoutConfiguration/ComponentManifest/
 * ContentManifest directly (not M9 inputs) and never writes to
 * GeneratedWebsite — every field here is either read back out of
 * `generatedWebsite.files`' own content or copied verbatim from
 * ThemeConfiguration (a real M9 input). Pure and deterministic.
 */
export function generateWebsitePreview(
  generatedWebsite: GeneratedWebsite,
  themeConfiguration: ThemeConfiguration,
): WebsitePreviewContent {
  return {
    businessName: extractBusinessName(generatedWebsite.files),
    themeName: themeConfiguration.themeName,
    themeId: themeConfiguration.themeId,
    devicePresets: DEVICE_PRESETS,
    files: generatedWebsite.files
      .map((file) => ({ path: file.path, sizeBytes: Buffer.byteLength(file.content, 'utf-8') }))
      .sort((a, b) => a.path.localeCompare(b.path)),
  };
}

// The business name has no dedicated field anywhere in GeneratedWebsite —
// it was baked into app/page.tsx's JSON-LD Organization/LocalBusiness
// entry by website-generator's seo-binder.ts (D-066/D-071's exact same
// "read it back out of structured data" technique M8.4 itself used for
// its own package.json naming). Throws when absent — every
// GeneratedWebsite produced by generateContentManifest()+assembleWebsite()
// always includes one; a missing entry means a corrupted/pre-M8.4 row,
// an internal-bug signal, not a legitimate business outcome (D-052-style
// internal-assertion semantics, carried into this module).
function extractBusinessName(files: GeneratedWebsiteFile[]): string {
  const pageFile = findFile(files, 'app/page.tsx');
  if (!pageFile) {
    throw new Error(
      'generateWebsitePreview: GeneratedWebsite.files has no app/page.tsx — cannot extract a business name.',
    );
  }

  const sourceFile = parseSourceFile(pageFile.content, 'page.tsx');
  const jsonLd = extractJsonLdPayloads(sourceFile);
  const businessEntry = jsonLd.find(
    (entry) => entry['@type'] === 'Organization' || entry['@type'] === 'LocalBusiness',
  );
  const name = businessEntry?.name;

  if (typeof name !== 'string' || name.trim() === '') {
    throw new Error(
      'generateWebsitePreview: app/page.tsx has no Organization/LocalBusiness JSON-LD entry with a "name" field — every GeneratedWebsite produced by assembleWebsite() always includes one.',
    );
  }
  return name;
}
