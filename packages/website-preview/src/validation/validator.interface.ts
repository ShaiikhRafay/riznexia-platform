import type {
  BusinessAnalysisOutput,
  GeneratedWebsiteFile,
  RuleCategory,
  ThemeConfiguration,
  ValidationRuleResult,
} from '@riznexia/shared-types';

// Module M9 (founder's Decision 3 + Future Compatibility requirement) —
// every validator is a pure function over the same input shape, owns
// exactly one RuleCategory, and never imports or calls another
// validator. `businessAnalysis`/`themeConfiguration` are threaded through
// to every validator uniformly (even validators that don't need them
// today) so a future validator — the founder's own examples: Security,
// Legal, Cookie, Brand, Broken-Link — never needs the input shape itself
// to change; it only needs a new file implementing this interface plus
// one new entry in validator-registry.ts. No existing validator file is
// ever touched to add one.
export interface ValidatorInput {
  files: GeneratedWebsiteFile[];
  businessAnalysis: BusinessAnalysisOutput;
  themeConfiguration: ThemeConfiguration;
}

export interface WebsiteValidator {
  readonly category: RuleCategory;
  /** Versions this specific validator's own rule set — distinct from VALIDATION_ENGINE_VERSION (the registry as a whole) and PREVIEW_ENGINE_VERSION (the Preview Engine, a separate concern). */
  readonly validatorVersion: string;
  validate(input: ValidatorInput): ValidationRuleResult[];
}
