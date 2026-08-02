import type { RuleCategory, RuleSeverity, ValidationRuleResult } from '@riznexia/shared-types';

// A small builder shared by every validator — keeps each individual rule
// check a one-line call instead of an 8-field object literal repeated
// dozens of times. `documentationUrl` is always null this phase (D-075 —
// no public docs site exists yet); the field stays present on every
// result for forward compatibility.
export function passRule(
  ruleId: string,
  ruleCategory: RuleCategory,
  ruleName: string,
  severity: RuleSeverity,
  message: string,
): ValidationRuleResult {
  return {
    ruleId,
    ruleCategory,
    ruleName,
    severity,
    status: 'pass',
    message,
    recommendation: null,
    documentationUrl: null,
  };
}

export function warningRule(
  ruleId: string,
  ruleCategory: RuleCategory,
  ruleName: string,
  severity: RuleSeverity,
  message: string,
  recommendation: string,
): ValidationRuleResult {
  return {
    ruleId,
    ruleCategory,
    ruleName,
    severity,
    status: 'warning',
    message,
    recommendation,
    documentationUrl: null,
  };
}

export function errorRule(
  ruleId: string,
  ruleCategory: RuleCategory,
  ruleName: string,
  severity: RuleSeverity,
  message: string,
  recommendation: string,
): ValidationRuleResult {
  return {
    ruleId,
    ruleCategory,
    ruleName,
    severity,
    status: 'error',
    message,
    recommendation,
    documentationUrl: null,
  };
}
