import { contrastRatio, WCAG_AA_NORMAL_TEXT_MIN_RATIO } from '../color-contrast';
import {
  findFile,
  findJsxElementsByTag,
  importedSectionComponentPaths,
  jsxAttributeStringValue,
  openingElementOf,
  parseSourceFile,
} from '../ast-inspect-helpers';
import { errorRule, passRule, warningRule } from './rule-builder';
import type { ValidatorInput, WebsiteValidator } from './validator.interface';
import type { ValidationRuleResult } from '@riznexia/shared-types';

// Module M9 — WCAG AA / semantic HTML / keyboard nav / ARIA / contrast /
// focus visibility. Two kinds of checks: (a) real per-business math
// (color contrast, computed from this business's actual ThemeConfiguration
// colors) and (b) template-conformance guards — since every Tier-1
// section component (packages/website-generator/templates/nextjs-base)
// is byte-identical across every generated site (D-068), most semantic-
// HTML/ARIA checks are effectively constant per template; they're
// re-checked here anyway as a real regression guard, scoped to only the
// specific templates THIS business's page.tsx actually renders (via its
// own import list), not the full template library.
const CATEGORY = 'accessibility' as const;

function cssCustomProperty(cssText: string, propertyName: string): string | undefined {
  const match = cssText.match(new RegExp(`--${propertyName}:\\s*([^;]+);`));
  return match?.[1]?.trim();
}

function parsePixels(value: string | undefined): number | null {
  if (!value) return null;
  const match = value.match(/^([\d.]+)px$/);
  return match ? Number(match[1]) : null;
}

export const accessibilityValidator: WebsiteValidator = {
  category: CATEGORY,
  validatorVersion: 'v1.0',

  validate({ files }: ValidatorInput): ValidationRuleResult[] {
    const results: ValidationRuleResult[] = [];
    const pageFile = findFile(files, 'app/page.tsx');
    const layoutFile = findFile(files, 'app/layout.tsx');
    const themeTokensFile = findFile(files, 'app/theme-tokens.css');
    const globalsFile = findFile(files, 'app/globals.css');

    const renderedTemplates = pageFile
      ? importedSectionComponentPaths(parseSourceFile(pageFile.content, 'page.tsx'))
      : [];

    results.push(checkSkipLink(layoutFile));
    results.push(checkMainLandmark(pageFile));
    results.push(checkNavigationLandmark(renderedTemplates));

    const templateSources = renderedTemplates
      .map((path) => findFile(files, path))
      .filter((file): file is NonNullable<typeof file> => !!file);

    results.push(checkImageAltText(templateSources));
    results.push(checkHeadingHierarchy(templateSources));
    results.push(checkKeyboardNavigation(files));
    results.push(checkColorContrast(themeTokensFile));
    results.push(checkFocusVisibility(globalsFile));
    results.push(checkTouchTargetSize(themeTokensFile));

    return results;
  },
};

function checkSkipLink(layoutFile: ReturnType<typeof findFile>): ValidationRuleResult {
  const present =
    !!layoutFile &&
    layoutFile.content.includes('skip-link') &&
    layoutFile.content.includes('#main-content');
  return present
    ? passRule(
        'A11Y-001',
        CATEGORY,
        'Skip-to-content link present',
        'high',
        'app/layout.tsx renders a skip link targeting #main-content',
      )
    : errorRule(
        'A11Y-001',
        CATEGORY,
        'Skip-to-content link present',
        'high',
        'No skip-to-content link found in app/layout.tsx',
        'Add a link to #main-content as the first focusable element on the page.',
      );
}

function checkMainLandmark(pageFile: ReturnType<typeof findFile>): ValidationRuleResult {
  if (!pageFile) {
    return errorRule(
      'A11Y-002',
      CATEGORY,
      'Main landmark present',
      'critical',
      'app/page.tsx is missing — cannot check for a <main> landmark',
      'Re-run website assembly.',
    );
  }
  const sourceFile = parseSourceFile(pageFile.content, 'page.tsx');
  const mains = findJsxElementsByTag(sourceFile, 'main');
  const hasMainContentId = mains.some(
    (main) => jsxAttributeStringValue(openingElementOf(main), 'id') === 'main-content',
  );
  return hasMainContentId
    ? passRule(
        'A11Y-002',
        CATEGORY,
        'Main landmark present',
        'critical',
        'A <main id="main-content"> landmark wraps the page content',
      )
    : errorRule(
        'A11Y-002',
        CATEGORY,
        'Main landmark present',
        'critical',
        'No <main id="main-content"> landmark found',
        'Wrap the rendered sections in a <main id="main-content"> element.',
      );
}

function checkNavigationLandmark(renderedTemplates: string[]): ValidationRuleResult {
  const present = renderedTemplates.includes('components/sections/navigation.tsx');
  return present
    ? passRule(
        'A11Y-003',
        CATEGORY,
        'Navigation landmark present',
        'high',
        'The page renders the Navigation component',
      )
    : errorRule(
        'A11Y-003',
        CATEGORY,
        'Navigation landmark present',
        'high',
        'No Navigation component rendered on the page',
        'Every generated page must render a Navigation component.',
      );
}

function checkImageAltText(
  templateSources: { path: string; content: string }[],
): ValidationRuleResult {
  const missingAlt: string[] = [];
  for (const file of templateSources) {
    const sourceFile = parseSourceFile(file.content, file.path);
    const images = findJsxElementsByTag(sourceFile, 'Image');
    for (const image of images) {
      const opening = openingElementOf(image);
      const hasAlt = opening.attributes.properties.some((property) =>
        property.getText().startsWith('alt'),
      );
      if (!hasAlt) missingAlt.push(file.path);
    }
  }
  return missingAlt.length === 0
    ? passRule(
        'A11Y-004',
        CATEGORY,
        'Images have alt text handling',
        'high',
        'Every rendered <Image> usage includes an alt attribute',
      )
    : errorRule(
        'A11Y-004',
        CATEGORY,
        'Images have alt text handling',
        'high',
        `<Image> without an alt attribute in: ${[...new Set(missingAlt)].join(', ')}`,
        'Every <Image> must set alt (a real description or alt="" for decorative images).',
      );
}

function checkHeadingHierarchy(
  templateSources: { path: string; content: string }[],
): ValidationRuleResult {
  let h1Count = 0;
  const deepHeadings: string[] = [];
  for (const file of templateSources) {
    h1Count += (file.content.match(/<h1[\s>]/g) ?? []).length;
    if (/<h[3-6][\s>]/.test(file.content)) deepHeadings.push(file.path);
  }

  if (deepHeadings.length > 0) {
    return errorRule(
      'A11Y-005',
      CATEGORY,
      'Heading hierarchy is consistent',
      'medium',
      `Heading levels deeper than <h2> found in: ${deepHeadings.join(', ')}`,
      'Keep heading depth to <h1>/<h2> only — deeper levels risk an inconsistent hierarchy for screen reader users.',
    );
  }
  if (h1Count === 1) {
    return passRule(
      'A11Y-005',
      CATEGORY,
      'Heading hierarchy is consistent',
      'medium',
      'Exactly one <h1> is rendered on the page, with no heading levels below <h2>',
    );
  }
  if (h1Count === 0) {
    return errorRule(
      'A11Y-005',
      CATEGORY,
      'Heading hierarchy is consistent',
      'medium',
      'No <h1> is rendered on the page',
      'Every page needs exactly one <h1> — typically the hero headline.',
    );
  }
  return warningRule(
    'A11Y-005',
    CATEGORY,
    'Heading hierarchy is consistent',
    'low',
    `${h1Count} <h1> elements rendered on the page`,
    'A page should have exactly one <h1> for a clear document outline.',
  );
}

function checkKeyboardNavigation(files: ValidatorInput['files']): ValidationRuleResult {
  const navigationFile = findFile(files, 'components/sections/navigation.tsx');
  const present =
    !!navigationFile &&
    navigationFile.content.includes('aria-expanded') &&
    navigationFile.content.includes('aria-controls');
  return present
    ? passRule(
        'A11Y-006',
        CATEGORY,
        'Mobile navigation is keyboard-operable',
        'high',
        'The mobile navigation disclosure exposes aria-expanded/aria-controls',
      )
    : errorRule(
        'A11Y-006',
        CATEGORY,
        'Mobile navigation is keyboard-operable',
        'high',
        'components/sections/navigation.tsx does not expose aria-expanded/aria-controls',
        'The mobile menu toggle must be a real, keyboard-operable disclosure widget.',
      );
}

function checkColorContrast(themeTokensFile: ReturnType<typeof findFile>): ValidationRuleResult {
  if (!themeTokensFile) {
    return errorRule(
      'A11Y-007',
      CATEGORY,
      'Text/background color contrast meets WCAG AA',
      'critical',
      'app/theme-tokens.css is missing — cannot check color contrast',
      'Re-run website assembly.',
    );
  }
  const text = cssCustomProperty(themeTokensFile.content, 'color-text');
  const background = cssCustomProperty(themeTokensFile.content, 'color-background');
  const ratio = text && background ? contrastRatio(text, background) : null;

  if (ratio === null) {
    return warningRule(
      'A11Y-007',
      CATEGORY,
      'Text/background color contrast meets WCAG AA',
      'high',
      `Could not compute a contrast ratio from --color-text (${text}) and --color-background (${background})`,
      'Use real hex color values so contrast can be verified.',
    );
  }
  return ratio >= WCAG_AA_NORMAL_TEXT_MIN_RATIO
    ? passRule(
        'A11Y-007',
        CATEGORY,
        'Text/background color contrast meets WCAG AA',
        'high',
        `Contrast ratio ${ratio.toFixed(2)}:1 meets the WCAG AA normal-text minimum of ${WCAG_AA_NORMAL_TEXT_MIN_RATIO}:1`,
      )
    : errorRule(
        'A11Y-007',
        CATEGORY,
        'Text/background color contrast meets WCAG AA',
        'high',
        `Contrast ratio ${ratio.toFixed(2)}:1 is below the WCAG AA normal-text minimum of ${WCAG_AA_NORMAL_TEXT_MIN_RATIO}:1`,
        'Choose a darker text color or lighter background color in the theme palette.',
      );
}

function checkFocusVisibility(globalsFile: ReturnType<typeof findFile>): ValidationRuleResult {
  if (!globalsFile) {
    return errorRule(
      'A11Y-008',
      CATEGORY,
      'Focus indicators are not suppressed',
      'high',
      'app/globals.css is missing — cannot check focus visibility',
      'Re-run website assembly.',
    );
  }
  const removesOutline = /outline:\s*(none|0)/.test(globalsFile.content);
  const hasFocusVisibleRule = globalsFile.content.includes('focus-visible');
  const problem = removesOutline && !hasFocusVisibleRule;
  return problem
    ? errorRule(
        'A11Y-008',
        CATEGORY,
        'Focus indicators are not suppressed',
        'high',
        'app/globals.css removes the default focus outline without a focus-visible replacement',
        'Never remove :focus outlines without providing an equally visible :focus-visible replacement.',
      )
    : passRule(
        'A11Y-008',
        CATEGORY,
        'Focus indicators are not suppressed',
        'high',
        'No unreplaced focus-outline removal found in app/globals.css',
      );
}

function checkTouchTargetSize(themeTokensFile: ReturnType<typeof findFile>): ValidationRuleResult {
  if (!themeTokensFile) {
    return errorRule(
      'A11Y-009',
      CATEGORY,
      'Minimum touch target size meets WCAG 2.5.5',
      'medium',
      'app/theme-tokens.css is missing — cannot check touch target size',
      'Re-run website assembly.',
    );
  }
  const minTouchTarget = parsePixels(
    cssCustomProperty(themeTokensFile.content, 'min-touch-target'),
  );
  return minTouchTarget !== null && minTouchTarget >= 44
    ? passRule(
        'A11Y-009',
        CATEGORY,
        'Minimum touch target size meets WCAG 2.5.5',
        'medium',
        `--min-touch-target is ${minTouchTarget}px (>= 44px)`,
      )
    : errorRule(
        'A11Y-009',
        CATEGORY,
        'Minimum touch target size meets WCAG 2.5.5',
        'medium',
        `--min-touch-target is ${minTouchTarget ?? 'unset'} — below the 44px WCAG 2.5.5 minimum`,
        'Set accessibilityProfile.minTouchTargetPx to at least 44 upstream.',
      );
}
