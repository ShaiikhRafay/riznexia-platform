import type {
  ComponentManifest,
  ContentManifest,
  LayoutConfiguration,
  ThemeConfiguration,
} from '@riznexia/shared-types';
import { mapComponentProps } from './component-props-mapper';
import { withGeneratedPackageName } from './package-json-generator';
import { generatePageSource } from './page-ast-generator';
import {
  generateManifestSource,
  generateRobotsSource,
  generateSitemapSource,
} from './seo-files-generator';
import { generateSiteDataSource } from './site-data-generator';
import { type GeneratedFile, loadStaticTemplateFiles } from './static-template-loader';
import { generateThemeTokensCss } from './theme-tokens-css-generator';

// Versions this module's assembly rules (which files it generates, how it
// merges the static template with per-business data) — distinct from the
// four upstream engine versions already recorded on the manifests it
// consumes.
export const ASSEMBLY_ENGINE_VERSION = 'v1.0';

// BusinessAnalysis is not a direct input here even though the phase brief
// names it among the "5 manifests" — by the time ThemeConfiguration,
// ComponentManifest, and ContentManifest exist, every BusinessAnalysis
// field this assembler could need (business name, brand copy, SEO
// keywords, ...) has already been carried through into them (M8.2/M8.3).
// The persistence layer (apps/api website-assembly module) still records
// businessAnalysisId on GeneratedWebsite for the same full FK-chaining
// discipline every M8.x Prisma model uses — this pure function just
// doesn't need the record itself.
export interface AssembleWebsiteInput {
  themeConfiguration: ThemeConfiguration;
  layoutConfiguration: LayoutConfiguration;
  componentManifest: ComponentManifest;
  contentManifest: ContentManifest;
}

/**
 * Assembles a complete, standalone Next.js project as a flat
 * {path, content}[] file list: the static template verbatim (Module
 * M8.4's "templates, never generated source strings" requirement) plus a
 * small set of per-business generated files (lib/site-data.ts,
 * app/page.tsx, app/theme-tokens.css, app/robots.ts, app/sitemap.ts,
 * app/manifest.ts, and package.json with its name field set). Every
 * generated file is built via the TypeScript Compiler API (ts.factory) or
 * a fixed line-based CSS serializer — no string-concatenated source code
 * anywhere. Pure and deterministic: the same four manifests always
 * produce the same file list. No AI calls, no regeneration of
 * layout/component/content — this only assembles what upstream phases
 * already produced.
 */
export function assembleWebsite(input: AssembleWebsiteInput): GeneratedFile[] {
  const businessName = extractBusinessName(input.contentManifest);
  const mappedComponents = mapComponentProps(
    input.componentManifest,
    input.contentManifest,
    input.layoutConfiguration,
    businessName,
  );

  const staticFiles = loadStaticTemplateFiles();
  const files: GeneratedFile[] = staticFiles.map((file) =>
    file.path === 'package.json'
      ? { path: file.path, content: withGeneratedPackageName(file.content, businessName) }
      : file,
  );

  files.push(
    { path: 'lib/site-data.ts', content: generateSiteDataSource(mappedComponents) },
    {
      path: 'app/page.tsx',
      content: generatePageSource(
        input.componentManifest,
        input.contentManifest,
        input.layoutConfiguration,
        mappedComponents,
        businessName,
      ),
    },
    {
      path: 'app/theme-tokens.css',
      content: generateThemeTokensCss(
        input.componentManifest.themeTokens,
        input.themeConfiguration.accessibilityProfile,
      ),
    },
    { path: 'app/robots.ts', content: generateRobotsSource() },
    { path: 'app/sitemap.ts', content: generateSitemapSource() },
    {
      path: 'app/manifest.ts',
      content: generateManifestSource(businessName, input.componentManifest.themeTokens),
    },
  );

  return files.sort((a, b) => a.path.localeCompare(b.path));
}

// The real business name has no field of its own in any M8.x manifest —
// it was already bound, with full source traceability, into
// ContentManifest.structuredData's Organization/LocalBusiness "name"
// field (Module M8.3, seo-binder.ts). Reusing it here avoids a sixth
// assembler input (the raw Business record) that the phase brief never
// listed.
function extractBusinessName(contentManifest: ContentManifest): string {
  const binding = contentManifest.structuredData.find(
    (entry) => entry.type === 'Organization' || entry.type === 'LocalBusiness',
  );
  const name = binding?.data.name;
  if (!name || typeof name.value !== 'string') {
    throw new Error(
      'website-assembler: ContentManifest.structuredData has no Organization/LocalBusiness entry with a string "name" field — every ContentManifest produced by generateContentManifest() always includes one (bindStructuredData() invariant).',
    );
  }
  return name.value;
}
