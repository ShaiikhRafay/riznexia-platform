import {
  findAllExportedConstValues,
  findFile,
  findNestedObjects,
  parseSourceFile,
} from '../ast-inspect-helpers';
import { errorRule, passRule } from './rule-builder';
import type { ValidatorInput, WebsiteValidator } from './validator.interface';
import type { ValidationRuleResult } from '@riznexia/shared-types';

// Module M9 — file/reference integrity: "does it exist", "does it
// resolve" — never "is the value good" (that's SEOValidator/
// AccessibilityValidator's job for metadata/markup, ContentCompleteness-
// Validator's job for bound content). Maps to the founder's "Validation
// Engine" checklist: missing pages, missing assets, broken routes,
// broken internal links, broken images, missing sitemap/robots.txt/
// manifest.json.
const CATEGORY = 'structural' as const;

const REQUIRED_FILES: { path: string; ruleId: string; ruleName: string }[] = [
  { path: 'app/page.tsx', ruleId: 'STRUCT-001', ruleName: 'Home page present' },
  { path: 'app/layout.tsx', ruleId: 'STRUCT-002', ruleName: 'Root layout present' },
  { path: 'lib/site-data.ts', ruleId: 'STRUCT-003', ruleName: 'Site data present' },
  { path: 'package.json', ruleId: 'STRUCT-004', ruleName: 'package.json present' },
  { path: 'app/robots.ts', ruleId: 'STRUCT-005', ruleName: 'robots.txt route present' },
  { path: 'app/sitemap.ts', ruleId: 'STRUCT-006', ruleName: 'sitemap.xml route present' },
  { path: 'app/manifest.ts', ruleId: 'STRUCT-007', ruleName: 'manifest.json route present' },
  { path: 'app/icon.svg', ruleId: 'STRUCT-008', ruleName: 'Favicon asset present' },
];

export const structuralValidator: WebsiteValidator = {
  category: CATEGORY,
  validatorVersion: 'v1.0',

  validate({ files }: ValidatorInput): ValidationRuleResult[] {
    const results: ValidationRuleResult[] = [];

    for (const required of REQUIRED_FILES) {
      const file = findFile(files, required.path);
      results.push(
        file
          ? passRule(
              required.ruleId,
              CATEGORY,
              required.ruleName,
              'high',
              `${required.path} is present`,
            )
          : errorRule(
              required.ruleId,
              CATEGORY,
              required.ruleName,
              'critical',
              `${required.path} is missing from the generated website`,
              `Re-run website assembly (POST /leads/:id/website) — every generated project must include ${required.path}.`,
            ),
      );
    }

    const siteDataValues = readSiteDataValues(files);
    results.push(validateBrokenInternalLinks(siteDataValues));
    results.push(validateBrokenImages(siteDataValues));

    return results;
  },
};

function readSiteDataValues(files: ValidatorInput['files']): unknown[] | null {
  const siteDataFile = findFile(files, 'lib/site-data.ts');
  if (!siteDataFile) return null;
  const sourceFile = parseSourceFile(siteDataFile.content, 'site-data.ts');
  return [...findAllExportedConstValues(sourceFile).values()];
}

// Component ids (`section-hero`, `main-content`, ...) and internal link
// targets (`targetComponentId`) are never literal JSX attributes in
// app/page.tsx — every component's props (including its own `id`) are
// spread onto it from lib/site-data.ts (`<SectionWrapper {...props}>`),
// and hrefs are built from a runtime template literal
// (`` `#${targetComponentId}` ``) inside the static template components,
// not printed as a string in page.tsx itself. Both real values only ever
// exist inside lib/site-data.ts's already-resolved props objects, so
// that's what this checks against — not page.tsx's own JSX.
function validateBrokenInternalLinks(siteDataValues: unknown[] | null): ValidationRuleResult {
  if (!siteDataValues) {
    return errorRule(
      'STRUCT-009',
      CATEGORY,
      'Internal links resolve',
      'high',
      'lib/site-data.ts is missing — cannot check internal links',
      'Re-run website assembly.',
    );
  }

  const ids = new Set(
    siteDataValues
      .flatMap((value) =>
        findNestedObjects(
          value,
          (candidate) =>
            typeof candidate.id === 'string' && typeof candidate.ariaLabel === 'string',
        ),
      )
      .map((section) => section.id as string),
  );
  // 'main-content' is a fixed landmark id set by the static app/layout.tsx/page.tsx templates themselves, never present in site-data.ts.
  ids.add('main-content');

  const targets = siteDataValues
    .flatMap((value) =>
      findNestedObjects(value, (candidate) => typeof candidate.targetComponentId === 'string'),
    )
    .map((link) => link.targetComponentId as string);
  const brokenTargets = targets.filter((target) => !ids.has(target));

  return brokenTargets.length === 0
    ? passRule(
        'STRUCT-009',
        CATEGORY,
        'Internal links resolve',
        'high',
        `${targets.length} internal link target(s) checked, all resolve to a real section`,
      )
    : errorRule(
        'STRUCT-009',
        CATEGORY,
        'Internal links resolve',
        'high',
        `${brokenTargets.length} internal link target(s) do not resolve to a real section: ${[...new Set(brokenTargets)].join(', ')}`,
        'Re-run website assembly — a broken internal link indicates a gap between LayoutConfiguration.pageStructure and the rendered page.',
      );
}

function validateBrokenImages(siteDataValues: unknown[] | null): ValidationRuleResult {
  if (!siteDataValues) {
    return errorRule(
      'STRUCT-010',
      CATEGORY,
      'Image references are non-empty',
      'medium',
      'lib/site-data.ts is missing — cannot check image references',
      'Re-run website assembly.',
    );
  }

  const imageRefs = siteDataValues.flatMap((value) =>
    findNestedObjects(value, (candidate) => 'photoReference' in candidate),
  );
  const broken = imageRefs.filter(
    (ref) => typeof ref.photoReference !== 'string' || ref.photoReference.trim() === '',
  );

  return broken.length === 0
    ? passRule(
        'STRUCT-010',
        CATEGORY,
        'Image references are non-empty',
        'medium',
        `${imageRefs.length} image reference(s) checked, all non-empty`,
      )
    : errorRule(
        'STRUCT-010',
        CATEGORY,
        'Image references are non-empty',
        'medium',
        `${broken.length} of ${imageRefs.length} image reference(s) have an empty photoReference`,
        'Check the upstream Business.photos data — an image slot was bound with no real photo reference.',
      );
}
