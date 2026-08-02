import type { ValidationRuleResult } from '@riznexia/shared-types';
import { accessibilityValidator } from './accessibility-validator';
import { contentCompletenessValidator } from './content-completeness-validator';
import { performanceValidator } from './performance-validator';
import { seoValidator } from './seo-validator';
import { structuralValidator } from './structural-validator';
import type { ValidatorInput, WebsiteValidator } from './validator.interface';

// Versions the registry as a whole (which validators are registered) —
// distinct from each individual validator's own validatorVersion and
// from PREVIEW_ENGINE_VERSION/PUBLISH_READINESS_ENGINE_VERSION (separate
// concerns, per the founder's "validationVersion" metadata field).
export const VALIDATION_ENGINE_VERSION = 'v1.0';

// The founder's explicit Future Compatibility requirement: a future
// validator (Security/Legal/Cookie/Brand/Broken-Link, per their own
// examples) is added by writing one new file implementing
// WebsiteValidator and adding it to this array — no existing validator
// file changes. Decision 3: validators never call each other; this
// registry is the only place that knows about all of them.
export const VALIDATOR_REGISTRY: WebsiteValidator[] = [
  structuralValidator,
  contentCompletenessValidator,
  seoValidator,
  accessibilityValidator,
  performanceValidator,
];

/** Runs every registered validator independently and flattens their results — the sole entry point PreviewReport generation and PublishReadinessEngine both consume, so they always evaluate the exact same rule set. */
export function runAllValidators(input: ValidatorInput): ValidationRuleResult[] {
  return VALIDATOR_REGISTRY.flatMap((validator) => validator.validate(input));
}
