import {
  extractJsonLdPayloads,
  findExportedConstValue,
  findFile,
  parseSourceFile,
} from '../ast-inspect-helpers';
import { errorRule, passRule, warningRule } from './rule-builder';
import type { ValidatorInput, WebsiteValidator } from './validator.interface';
import type { ValidationRuleResult } from '@riznexia/shared-types';

// Module M9 — checks the *value* completeness of app/page.tsx's Metadata
// export and JSON-LD structured data (never whether the files themselves
// exist — that's StructuralValidator's job). Reads back exactly what
// page-ast-generator.ts (packages/website-generator) wrote — the SEO
// requirement's own mirror image.
const CATEGORY = 'seo' as const;

interface Metadata {
  title?: unknown;
  description?: unknown;
  keywords?: unknown;
  alternates?: { canonical?: unknown };
  openGraph?: { title?: unknown; description?: unknown; type?: unknown };
  twitter?: { card?: unknown; title?: unknown; description?: unknown };
}

function nonEmptyString(value: unknown): boolean {
  return typeof value === 'string' && value.trim() !== '';
}

export const seoValidator: WebsiteValidator = {
  category: CATEGORY,
  validatorVersion: 'v1.0',

  validate({ files }: ValidatorInput): ValidationRuleResult[] {
    const pageFile = findFile(files, 'app/page.tsx');
    if (!pageFile) {
      return [
        errorRule(
          'SEO-000',
          CATEGORY,
          'Metadata present',
          'critical',
          'app/page.tsx is missing — cannot check SEO metadata',
          'Re-run website assembly.',
        ),
      ];
    }

    const sourceFile = parseSourceFile(pageFile.content, 'page.tsx');
    const metadata = (findExportedConstValue(sourceFile, 'metadata') ?? {}) as Metadata;
    const jsonLd = extractJsonLdPayloads(sourceFile);

    return [
      checkField(
        'SEO-001',
        'Title present',
        'critical',
        nonEmptyString(metadata.title),
        'metadata.title',
      ),
      checkField(
        'SEO-002',
        'Description present',
        'high',
        nonEmptyString(metadata.description),
        'metadata.description',
      ),
      checkField(
        'SEO-003',
        'Keywords present',
        'medium',
        Array.isArray(metadata.keywords) && metadata.keywords.length > 0,
        'metadata.keywords',
      ),
      checkField(
        'SEO-004',
        'Canonical URL present',
        'high',
        nonEmptyString(metadata.alternates?.canonical),
        'metadata.alternates.canonical',
      ),
      checkField(
        'SEO-005',
        'OpenGraph tags present',
        'high',
        nonEmptyString(metadata.openGraph?.title) &&
          nonEmptyString(metadata.openGraph?.description) &&
          nonEmptyString(metadata.openGraph?.type),
        'metadata.openGraph',
      ),
      checkField(
        'SEO-006',
        'Twitter Card tags present',
        'medium',
        nonEmptyString(metadata.twitter?.card) &&
          nonEmptyString(metadata.twitter?.title) &&
          nonEmptyString(metadata.twitter?.description),
        'metadata.twitter',
      ),
      checkField(
        'SEO-007',
        'JSON-LD structured data present',
        'high',
        jsonLd.length > 0,
        'app/page.tsx JSON-LD <script> tags',
      ),
      checkJsonLdType(
        'SEO-008',
        'LocalBusiness schema present',
        'high',
        jsonLd,
        'LocalBusiness',
        'error',
      ),
      checkJsonLdType(
        'SEO-009',
        'Organization schema present',
        'high',
        jsonLd,
        'Organization',
        'error',
      ),
      checkJsonLdType('SEO-010', 'FAQ schema present', 'low', jsonLd, 'FAQPage', 'warning'),
      checkJsonLdType(
        'SEO-011',
        'Breadcrumb schema present',
        'medium',
        jsonLd,
        'BreadcrumbList',
        'warning',
      ),
    ];
  },
};

function checkField(
  ruleId: string,
  ruleName: string,
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info',
  present: boolean,
  fieldPath: string,
): ValidationRuleResult {
  return present
    ? passRule(ruleId, CATEGORY, ruleName, severity, `${fieldPath} is present`)
    : errorRule(
        ruleId,
        CATEGORY,
        ruleName,
        severity,
        `${fieldPath} is missing or empty`,
        `Set a real value for ${fieldPath} in the source content before publishing.`,
      );
}

function checkJsonLdType(
  ruleId: string,
  ruleName: string,
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info',
  jsonLd: Record<string, unknown>[],
  type: string,
  missingStatus: 'error' | 'warning',
): ValidationRuleResult {
  const present = jsonLd.some((entry) => entry['@type'] === type);
  if (present) {
    return passRule(ruleId, CATEGORY, ruleName, severity, `A ${type} JSON-LD entry is present`);
  }
  const message = `No ${type} JSON-LD entry found`;
  const recommendation =
    type === 'FAQPage'
      ? 'Expected only when real FAQ content exists — not necessarily an issue.'
      : type === 'BreadcrumbList'
        ? 'Expected whenever the page has at least one non-footer section.'
        : `Add ${type} structured data before publishing.`;
  return missingStatus === 'error'
    ? errorRule(ruleId, CATEGORY, ruleName, severity, message, recommendation)
    : warningRule(ruleId, CATEGORY, ruleName, severity, message, recommendation);
}
