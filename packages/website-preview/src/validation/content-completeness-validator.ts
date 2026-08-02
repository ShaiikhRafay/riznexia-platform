import { findAllExportedConstValues, findFile, parseSourceFile } from '../ast-inspect-helpers';
import { errorRule, passRule } from './rule-builder';
import type { ValidatorInput, WebsiteValidator } from './validator.interface';
import type { ValidationRuleResult } from '@riznexia/shared-types';

// Module M9 — checks that every content field M8.3's Content Binder
// actually bound (a "sourced value" — `{value, source}`, present in
// lib/site-data.ts's per-component props) is non-empty. Every field
// present here was already resolved to a real value by generateContent
// Manifest() (an unresolved slot is never written into componentContent
// at all — M8.3 D-061), so a present-but-empty field indicates a real
// upstream bug, not a legitimate "optional and absent" case (absent
// optional fields simply don't appear in the props object). All results
// share the same fixed ruleId ("CONTENT-001") — this is one check
// applied once per bound field, not a catalog of distinct checks; the
// number of instances varies per business (however many fields M8.3
// bound), same reason structural-validator.ts aggregates broken-link/
// broken-image findings rather than pre-declaring a fixed count.
const CATEGORY = 'content' as const;
const RULE_ID = 'CONTENT-001';
const RULE_NAME = 'Bound content field is non-empty';

interface SourcedValueShape {
  value: unknown;
  source: string;
}

function isSourcedValueShape(candidate: unknown): candidate is SourcedValueShape {
  return (
    !!candidate &&
    typeof candidate === 'object' &&
    'value' in (candidate as Record<string, unknown>) &&
    typeof (candidate as Record<string, unknown>).source === 'string'
  );
}

function isEmpty(value: unknown): boolean {
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value)) return value.length === 0;
  if (value && typeof value === 'object') {
    return !Object.values(value as Record<string, unknown>).some(
      (field) => typeof field === 'string' && field.trim() !== '',
    );
  }
  return value === null || value === undefined;
}

/** Finds every `{value, source}`-shaped field directly on a props object (one level — every SourcedValue in this pipeline is a top-level prop, never nested inside another sourced value). */
function findSourcedFields(
  propsValue: unknown,
): { fieldName: string; sourced: SourcedValueShape }[] {
  if (!propsValue || typeof propsValue !== 'object' || Array.isArray(propsValue)) return [];
  const found: { fieldName: string; sourced: SourcedValueShape }[] = [];
  for (const [fieldName, fieldValue] of Object.entries(propsValue as Record<string, unknown>)) {
    if (isSourcedValueShape(fieldValue)) {
      found.push({ fieldName, sourced: fieldValue });
    }
  }
  return found;
}

export const contentCompletenessValidator: WebsiteValidator = {
  category: CATEGORY,
  validatorVersion: 'v1.0',

  validate({ files }: ValidatorInput): ValidationRuleResult[] {
    const siteDataFile = findFile(files, 'lib/site-data.ts');
    if (!siteDataFile) {
      return [
        errorRule(
          RULE_ID,
          CATEGORY,
          RULE_NAME,
          'high',
          'lib/site-data.ts is missing — cannot check content completeness',
          'Re-run website assembly.',
        ),
      ];
    }

    const sourceFile = parseSourceFile(siteDataFile.content, 'site-data.ts');
    const results: ValidationRuleResult[] = [];

    for (const [varName, propsValue] of findAllExportedConstValues(sourceFile)) {
      for (const { fieldName, sourced } of findSourcedFields(propsValue)) {
        results.push(
          isEmpty(sourced.value)
            ? errorRule(
                RULE_ID,
                CATEGORY,
                RULE_NAME,
                'medium',
                `${varName}.${fieldName} was bound (source: "${sourced.source}") but its value is empty`,
                'Check the upstream content binder — a resolved field should never be empty.',
              )
            : passRule(
                RULE_ID,
                CATEGORY,
                RULE_NAME,
                'medium',
                `${varName}.${fieldName} is bound and non-empty (source: "${sourced.source}")`,
              ),
        );
      }
    }

    return results;
  },
};
