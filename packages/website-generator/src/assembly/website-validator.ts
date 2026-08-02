import type {
  ComponentManifest,
  ContentManifest,
  LayoutConfiguration,
} from '@riznexia/shared-types';
import type { GeneratedFile } from './static-template-loader';

// Module M8.4 — post-assembly invariant checks, same internal-assertion
// semantics as layout-validator.ts/component-validator.ts/content-validator.ts
// (D-052/D-060/D-061+): every input manifest is already validated by its
// own phase, and every rule here is a fixed structural check, so a
// failure means a bug in the assembler itself, not a legitimate business
// outcome. Throws a plain Error, never a new domain exception.
const REQUIRED_FILES = [
  'package.json',
  'tsconfig.json',
  'next.config.js',
  'tailwind.config.ts',
  'postcss.config.js',
  'app/layout.tsx',
  'app/page.tsx',
  'app/globals.css',
  'app/theme-tokens.css',
  'app/robots.ts',
  'app/sitemap.ts',
  'app/manifest.ts',
  'app/icon.svg',
  'lib/site-data.ts',
  'lib/types.ts',
  'lib/utils.ts',
];

export function validateWebsiteAssembly(
  files: GeneratedFile[],
  componentManifest: ComponentManifest,
  contentManifest: ContentManifest,
  layoutConfiguration: LayoutConfiguration,
): void {
  const filesByPath = new Set(files.map((file) => file.path));

  // Missing assets / invalid routing — every file the generated project's
  // own imports and Next.js's own App Router file conventions require.
  for (const requiredPath of REQUIRED_FILES) {
    assertAssembly(filesByPath.has(requiredPath), `missing required file "${requiredPath}"`);
  }
  assertAssembly(
    new Set(files.map((f) => f.path)).size === files.length,
    'duplicate file path in assembled project',
  );

  const componentIds = new Set(
    componentManifest.components.map((component) => component.componentId),
  );

  // Missing components — every LayoutConfiguration.pageStructure entry
  // must have a matching 'section' ComponentDefinition (page-ast-generator
  // depends on this to build app/page.tsx's section order).
  for (const section of layoutConfiguration.pageStructure) {
    assertAssembly(
      componentIds.has(`section-${section.sectionId}`),
      `LayoutConfiguration.pageStructure section "${section.sectionId}" has no matching ComponentManifest section component`,
    );
  }
  assertAssembly(
    componentManifest.components.some((component) => component.componentType === 'navigation'),
    'ComponentManifest has no navigation component',
  );

  // Broken references — every internal link target (CTA links, nav links,
  // breadcrumb items) bound into componentContent or structuredData must
  // resolve to a real componentId in this same ComponentManifest.
  const missingAssets: string[] = [];
  for (const binding of contentManifest.componentContent) {
    for (const field of binding.fields) {
      for (const target of extractLinkTargets(field.value)) {
        if (!componentIds.has(target)) {
          missingAssets.push(`${binding.componentId}::${field.slotName} -> "${target}"`);
        }
      }
    }
  }
  for (const structuredData of contentManifest.structuredData) {
    for (const [key, value] of Object.entries(structuredData.data)) {
      for (const target of extractLinkTargets(value)) {
        if (!componentIds.has(target)) {
          missingAssets.push(`structuredData.${structuredData.type}.${key} -> "${target}"`);
        }
      }
    }
  }
  assertAssembly(
    missingAssets.length === 0,
    `broken internal references: ${missingAssets.join(', ')}`,
  );

  // Missing content — every component the ComponentManifest declares must
  // have an entry in ContentManifest.componentContent (possibly with zero
  // bound fields, e.g. the footer's zero-child 'section' component), so
  // component-props-mapper never silently drops a component.
  const contentComponentIds = new Set(
    contentManifest.componentContent.map((entry) => entry.componentId),
  );
  for (const component of componentManifest.components) {
    if (component.componentType === 'section' && component.childComponentIds.length === 0) continue;
    assertAssembly(
      contentComponentIds.has(component.componentId) || component.requiredContent.length === 0,
      `component "${component.componentId}" has required content slots but no ContentManifest.componentContent entry`,
    );
  }

  // Invalid metadata.
  assertAssembly(
    contentManifest.seoMetadata.keywords.value.length > 0,
    'seoMetadata.keywords must be non-empty',
  );
}

function extractLinkTargets(value: { value: unknown }): string[] {
  const raw = value.value;
  if (Array.isArray(raw)) {
    return raw
      .map((item) => (item as { targetComponentId?: string }).targetComponentId)
      .filter((id): id is string => typeof id === 'string');
  }
  const targetComponentId = (raw as { targetComponentId?: string } | null)?.targetComponentId;
  return typeof targetComponentId === 'string' ? [targetComponentId] : [];
}

function assertAssembly(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(`Website assembly validation failed: ${message}`);
  }
}
