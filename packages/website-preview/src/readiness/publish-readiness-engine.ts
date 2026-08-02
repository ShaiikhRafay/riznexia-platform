import type {
  RuleCategory,
  ScoreBreakdown,
  ScoreDeduction,
  ValidationRuleResult,
} from '@riznexia/shared-types';

// Module M9 (founder's Decision 3) — PublishReadinessEngine is responsible
// ONLY for aggregating already-computed validator output; it never
// inspects GeneratedWebsite.files itself and never calls a validator.
// Every function here is a pure fold over a `ValidationRuleResult[]`
// that was produced elsewhere (validator-registry.ts's runAllValidators()).
export const PUBLISH_READINESS_ENGINE_VERSION = 'v1.0';

export interface PublishReadinessContent {
  seoScore: ScoreBreakdown;
  accessibilityScore: ScoreBreakdown;
  performanceScore: ScoreBreakdown;
  contentCompletenessScore: ScoreBreakdown;
  structuralIntegrityScore: ScoreBreakdown;
  overallPublishScore: ScoreBreakdown;
}

// Each category maps 1:1 onto a registered validator's own category
// (structural.ts -> Structural Integrity, content-completeness.ts ->
// Content Completeness, ...) — a future validator with a genuinely new
// category (e.g. 'security') contributes its rules to PreviewReport and
// is visible there, but doesn't yet get its own named score field here;
// that's a deliberate, documented limitation (see the review report),
// not an oversight — adding a 6th named score is a future schema change
// to this engine specifically, independent of adding the validator itself.
const OVERALL_WEIGHTS: { category: RuleCategory; label: string; weight: number }[] = [
  { category: 'seo', label: 'SEO', weight: 0.2 },
  { category: 'accessibility', label: 'Accessibility', weight: 0.25 },
  { category: 'performance', label: 'Performance', weight: 0.15 },
  { category: 'content', label: 'Content Completeness', weight: 0.2 },
  { category: 'structural', label: 'Structural Integrity', weight: 0.2 },
];

/**
 * Every rule in a category is worth an equal share of 100 points; a
 * warning costs half its share, an error costs all of it, a pass costs
 * nothing — deliberately simple and fully auditable (founder's "must
 * explain why points were deducted" requirement), rather than a more
 * opaque severity-weighted formula. A category with no rules at all
 * scores 100 (nothing was found wrong, since nothing was checked) —
 * documented as a known limitation, not silently favorable.
 */
function computeCategoryScore(rules: ValidationRuleResult[]): ScoreBreakdown {
  if (rules.length === 0) {
    return { score: 100, maxScore: 100, deductions: [] };
  }

  const weightPerRule = 100 / rules.length;
  const deductions: ScoreDeduction[] = [];

  for (const rule of rules) {
    const deductionFraction = rule.status === 'pass' ? 0 : rule.status === 'warning' ? 0.5 : 1;
    const pointsDeducted = Math.round(weightPerRule * deductionFraction * 100) / 100;
    if (pointsDeducted > 0) {
      deductions.push({
        ruleId: rule.ruleId,
        ruleName: rule.ruleName,
        pointsDeducted,
        reason: rule.message,
      });
    }
  }

  const totalDeducted = deductions.reduce((sum, deduction) => sum + deduction.pointsDeducted, 0);
  const score = Math.max(0, Math.min(100, Math.round(100 - totalDeducted)));
  return { score, maxScore: 100, deductions };
}

function computeOverallScore(categoryScores: Record<RuleCategory, ScoreBreakdown>): ScoreBreakdown {
  const deductions: ScoreDeduction[] = [];
  let weightedScore = 0;

  for (const { category, label, weight } of OVERALL_WEIGHTS) {
    const categoryScore = categoryScores[category];
    weightedScore += categoryScore.score * weight;
    const shortfall = Math.round((100 - categoryScore.score) * weight * 100) / 100;
    if (shortfall > 0) {
      deductions.push({
        ruleId: `OVERALL-${category.toUpperCase()}`,
        ruleName: `${label} category score`,
        pointsDeducted: shortfall,
        reason: `${label} scored ${categoryScore.score}/100, weighted at ${Math.round(weight * 100)}% of the overall score`,
      });
    }
  }

  return { score: Math.round(weightedScore), maxScore: 100, deductions };
}

/** Aggregates a flat rule list (from every currently-registered validator, whichever they are) into the five named category scores plus an overall score. Pure — no I/O, no validation of its own. */
export function aggregateReadiness(rules: ValidationRuleResult[]): PublishReadinessContent {
  const byCategory: Record<RuleCategory, ValidationRuleResult[]> = {
    structural: [],
    content: [],
    seo: [],
    accessibility: [],
    performance: [],
  };
  for (const rule of rules) {
    byCategory[rule.ruleCategory]?.push(rule);
  }

  const structuralIntegrityScore = computeCategoryScore(byCategory.structural);
  const contentCompletenessScore = computeCategoryScore(byCategory.content);
  const seoScore = computeCategoryScore(byCategory.seo);
  const accessibilityScore = computeCategoryScore(byCategory.accessibility);
  const performanceScore = computeCategoryScore(byCategory.performance);

  const overallPublishScore = computeOverallScore({
    structural: structuralIntegrityScore,
    content: contentCompletenessScore,
    seo: seoScore,
    accessibility: accessibilityScore,
    performance: performanceScore,
  });

  return {
    seoScore,
    accessibilityScore,
    performanceScore,
    contentCompletenessScore,
    structuralIntegrityScore,
    overallPublishScore,
  };
}
