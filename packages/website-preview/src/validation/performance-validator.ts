import { findFile, importedSectionComponentPaths, parseSourceFile } from '../ast-inspect-helpers';
import { errorRule, passRule, warningRule } from './rule-builder';
import type { ValidatorInput, WebsiteValidator } from './validator.interface';
import type { ValidationRuleResult } from '@riznexia/shared-types';

// Module M9 — deterministic, static-analysis-only readiness proxies. Per
// the founder's explicit instruction, this never runs Lighthouse (or any
// other live tool) — bundle size, Core Web Vitals readiness, etc. are
// approximated from source-text patterns, not measured. Each proxy's
// limitation is documented on its own rule below.
const CATEGORY = 'performance' as const;

// Above this count of 'use client' boundaries among the templates a
// specific business's page actually renders, the client JS bundle is
// large enough to be worth flagging — a coarse, fixed threshold (not a
// real byte count, since that requires an actual `next build`, D-074's
// documented tradeoff for the M8.4 smoke test, which this module
// deliberately doesn't repeat per-request).
const CLIENT_COMPONENT_WARNING_THRESHOLD = 6;

export const performanceValidator: WebsiteValidator = {
  category: CATEGORY,
  validatorVersion: 'v1.0',

  validate({ files }: ValidatorInput): ValidationRuleResult[] {
    const results: ValidationRuleResult[] = [];
    const pageFile = findFile(files, 'app/page.tsx');
    const renderedTemplates = pageFile
      ? importedSectionComponentPaths(parseSourceFile(pageFile.content, 'page.tsx'))
      : [];
    const templateSources = renderedTemplates
      .map((path) => findFile(files, path))
      .filter((file): file is NonNullable<typeof file> => !!file);

    results.push(checkNextImageUsage(templateSources));
    results.push(checkHeroPriorityLoading(files));
    results.push(checkClientBundleSize(templateSources));
    results.push(checkStaticGenerationEligibility(pageFile));
    results.push(checkReducedMotionRespect(templateSources));

    return results;
  },
};

function checkNextImageUsage(
  templateSources: { path: string; content: string }[],
): ValidationRuleResult {
  const rawImgUsages = templateSources
    .filter((file) => /<img[\s>]/.test(file.content))
    .map((file) => file.path);
  return rawImgUsages.length === 0
    ? passRule(
        'PERF-001',
        CATEGORY,
        'Images use next/image',
        'high',
        'No raw <img> tags found among rendered templates — next/image is used throughout',
      )
    : errorRule(
        'PERF-001',
        CATEGORY,
        'Images use next/image',
        'high',
        `Raw <img> tag found in: ${rawImgUsages.join(', ')}`,
        'Use next/image for automatic optimization, responsive sizing, and lazy loading.',
      );
}

function checkHeroPriorityLoading(files: ValidatorInput['files']): ValidationRuleResult {
  const heroFile = findFile(files, 'components/sections/hero.tsx');
  const usesPriority = !!heroFile && heroFile.content.includes('priority');
  return usesPriority
    ? passRule(
        'PERF-002',
        CATEGORY,
        'Hero image eligible for priority loading',
        'medium',
        'components/sections/hero.tsx marks its background image priority when applicable',
      )
    : warningRule(
        'PERF-002',
        CATEGORY,
        'Hero image eligible for priority loading',
        'medium',
        'components/sections/hero.tsx does not use priority loading',
        'The largest above-the-fold image should load with priority for a faster Largest Contentful Paint.',
      );
}

function checkClientBundleSize(
  templateSources: { path: string; content: string }[],
): ValidationRuleResult {
  const clientComponentCount = templateSources.filter((file) =>
    file.content.includes("'use client'"),
  ).length;
  return clientComponentCount <= CLIENT_COMPONENT_WARNING_THRESHOLD
    ? passRule(
        'PERF-003',
        CATEGORY,
        'Client-side bundle size proxy',
        'low',
        `${clientComponentCount} client component(s) rendered on this page (threshold: ${CLIENT_COMPONENT_WARNING_THRESHOLD}) — heuristic, not a measured byte count`,
      )
    : warningRule(
        'PERF-003',
        CATEGORY,
        'Client-side bundle size proxy',
        'low',
        `${clientComponentCount} client component(s) rendered on this page, above the ${CLIENT_COMPONENT_WARNING_THRESHOLD} heuristic threshold`,
        'Consider whether every interactive component genuinely needs client-side JS — this is a structural proxy, not a measured bundle size.',
      );
}

function checkStaticGenerationEligibility(
  pageFile: ReturnType<typeof findFile>,
): ValidationRuleResult {
  if (!pageFile) {
    return errorRule(
      'PERF-004',
      CATEGORY,
      'Eligible for static generation',
      'high',
      'app/page.tsx is missing — cannot check static generation eligibility',
      'Re-run website assembly.',
    );
  }
  const blocksStaticGeneration = /force-dynamic|export const revalidate\s*=\s*0/.test(
    pageFile.content,
  );
  return blocksStaticGeneration
    ? errorRule(
        'PERF-004',
        CATEGORY,
        'Eligible for static generation',
        'high',
        'app/page.tsx contains a directive that forces dynamic rendering',
        'Remove force-dynamic/revalidate=0 — this page has no data dependency that requires it.',
      )
    : passRule(
        'PERF-004',
        CATEGORY,
        'Eligible for static generation',
        'high',
        'No directive blocking static generation was found',
      );
}

function checkReducedMotionRespect(
  templateSources: { path: string; content: string }[],
): ValidationRuleResult {
  const animatedWithoutGuard = templateSources
    .filter(
      (file) => file.content.includes('motion.') && !file.content.includes('useReducedMotion'),
    )
    .map((file) => file.path);
  return animatedWithoutGuard.length === 0
    ? passRule(
        'PERF-005',
        CATEGORY,
        'Animations respect prefers-reduced-motion',
        'medium',
        'Every animated template checks useReducedMotion()',
      )
    : errorRule(
        'PERF-005',
        CATEGORY,
        'Animations respect prefers-reduced-motion',
        'medium',
        `Animated without a reduced-motion guard: ${animatedWithoutGuard.join(', ')}`,
        'Skip or simplify Framer Motion transitions when useReducedMotion() is true.',
      );
}
