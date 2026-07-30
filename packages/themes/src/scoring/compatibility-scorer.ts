import type { ThemeDefinition } from '../provider/theme-provider.interface';

// Module M7 (founder's explicit "compatibility validation before
// selection" requirement) — five named check categories, each contributing
// to a weighted composite score. Deterministic, no AI: this is the "rules
// validate" half of "AI recommends, rules validate" — the AI's
// classification (aiRecommendedThemeId/aiRecommendationConfidence) is one
// input signal to the industry check, never a score override.
export interface CompatibilityScoringInput {
  /** BusinessAnalysis.brandBrief.industry — free text, AI-derived in M6. */
  industry: string;
  /** Business.category — Places-derived, independent signal from `industry`. */
  businessCategory: string;
  /** BusinessAnalysis.brandBrief.layoutStyle — free text, AI-derived in M6. */
  layoutStyle: string;
  /** BusinessAnalysis.brandBrief.websiteSections. */
  websiteSections: string[];
  /** Optional — from the lightweight AI classification step (packages/ai). */
  aiRecommendedThemeId?: string;
  /** 0–1. Required if aiRecommendedThemeId is set. */
  aiRecommendationConfidence?: number;
}

export interface CompatibilityBreakdown {
  industryScore: number;
  layoutScore: number;
  accessibilityScore: number;
  mobileScore: number;
  componentAvailabilityScore: number;
  /** Weighted composite, 0–100. */
  compositeScore: number;
}

export const COMPATIBILITY_WEIGHTS = {
  industry: 0.4,
  layout: 0.2,
  accessibility: 0.15,
  mobile: 0.1,
  componentAvailability: 0.15,
} as const;

// Founder's explicit gate: "If no theme reaches the minimum compatibility
// score, return THEME_NOT_FOUND. Do not guess." A composite this low
// generally means neither keyword evidence nor the AI's classification
// pointed at the theme at all.
export const MINIMUM_COMPATIBILITY_SCORE = 50;

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function wordsOf(text: string): string[] {
  return normalize(text)
    .split(' ')
    .filter((word) => word.length > 2);
}

// Industry compatibility — direct substring match against the theme's
// declared industryCategories first; falls back to partial word overlap;
// blended (never overridden) by the AI's classification when present;
// Corporate always carries a baseline floor so it remains a viable
// universal fallback.
function scoreIndustry(theme: ThemeDefinition, input: CompatibilityScoringInput): number {
  const target = normalize(`${input.industry} ${input.businessCategory}`);
  const directMatch = theme.content.industryCategories.some((category) => {
    const normalizedCategory = normalize(category);
    return target.includes(normalizedCategory) || normalizedCategory.includes(target);
  });

  let score = 0;
  if (directMatch) {
    score = 100;
  } else {
    const targetWords = new Set(wordsOf(target));
    const overlapFractions = theme.content.industryCategories.map((category) => {
      const categoryWords = wordsOf(category);
      if (categoryWords.length === 0) {
        return 0;
      }
      const overlap = categoryWords.filter((word) => targetWords.has(word)).length;
      return overlap / categoryWords.length;
    });
    score = Math.max(0, ...overlapFractions) * 100;
  }

  if (input.aiRecommendedThemeId === theme.id && input.aiRecommendationConfidence !== undefined) {
    // AI alone can carry a theme to at most 90 — it never fully overrides
    // absent keyword evidence (rules stay the authority).
    const aiBoost = input.aiRecommendationConfidence * 90;
    score = Math.max(score, aiBoost);
  }

  if (theme.id === 'corporate') {
    score = Math.max(score, 40);
  }

  return Math.min(100, score);
}

// Layout compatibility — fuzzy keyword overlap between M6's free-text
// layoutStyle description and the theme's declared layoutKeywords. Soft
// preference, not a hard requirement — a theme with no keyword hits still
// gets a modest non-zero baseline.
function scoreLayout(theme: ThemeDefinition, input: CompatibilityScoringInput): number {
  if (theme.content.layoutKeywords.length === 0) {
    return 50;
  }
  const text = normalize(input.layoutStyle);
  const matches = theme.content.layoutKeywords.filter((keyword) =>
    text.includes(normalize(keyword)),
  );
  if (matches.length === 0) {
    return 20;
  }
  return Math.min(100, 50 + 50 * (matches.length / theme.content.layoutKeywords.length));
}

// Accessibility compatibility — every registered theme is authored to meet
// this baseline, so this is a real guard against a misconfigured
// definition slipping through, not a decorative always-100 check.
function scoreAccessibility(theme: ThemeDefinition): number {
  const profile = theme.content.accessibilityProfile;
  let score = 100;
  if (profile.contrastLevel !== 'AA' && profile.contrastLevel !== 'AAA') {
    score -= 40;
  }
  if (profile.minTouchTargetPx < 44) {
    score -= 30;
  }
  if (!profile.reducedMotionSupport) {
    score -= 15;
  }
  if (!profile.altTextRequired) {
    score -= 15;
  }
  return Math.max(0, score);
}

// Mobile compatibility — same "real guard" rationale as accessibility.
function scoreMobile(theme: ThemeDefinition): number {
  const preferences = theme.content.mobilePreferences;
  let score = 100;
  if (preferences.tapTargetSizePx < 44) {
    score -= 50;
  }
  if (!preferences.stackedLayout) {
    score -= 50;
  }
  return Math.max(0, score);
}

// Component availability — the fraction of BusinessAnalysis's requested
// websiteSections the theme's componentSet/sectionOrder can plausibly
// cover (fuzzy substring match, since M6's section names are free text and
// a theme's are fixed kebab-case identifiers).
function scoreComponentAvailability(
  theme: ThemeDefinition,
  input: CompatibilityScoringInput,
): number {
  if (input.websiteSections.length === 0) {
    return 100;
  }
  const availableTokens = [...theme.content.componentSet, ...theme.content.sectionOrder].map(
    normalize,
  );
  const covered = input.websiteSections.filter((section) => {
    const normalizedSection = normalize(section);
    return availableTokens.some(
      (token) => token.includes(normalizedSection) || normalizedSection.includes(token),
    );
  });
  return (covered.length / input.websiteSections.length) * 100;
}

export function scoreThemeCompatibility(
  theme: ThemeDefinition,
  input: CompatibilityScoringInput,
): CompatibilityBreakdown {
  const industryScore = scoreIndustry(theme, input);
  const layoutScore = scoreLayout(theme, input);
  const accessibilityScore = scoreAccessibility(theme);
  const mobileScore = scoreMobile(theme);
  const componentAvailabilityScore = scoreComponentAvailability(theme, input);

  const compositeScore =
    industryScore * COMPATIBILITY_WEIGHTS.industry +
    layoutScore * COMPATIBILITY_WEIGHTS.layout +
    accessibilityScore * COMPATIBILITY_WEIGHTS.accessibility +
    mobileScore * COMPATIBILITY_WEIGHTS.mobile +
    componentAvailabilityScore * COMPATIBILITY_WEIGHTS.componentAvailability;

  return {
    industryScore,
    layoutScore,
    accessibilityScore,
    mobileScore,
    componentAvailabilityScore,
    compositeScore: Math.round(compositeScore * 100) / 100,
  };
}

export interface RankedTheme {
  theme: ThemeDefinition;
  breakdown: CompatibilityBreakdown;
}

// Founder's explicit ranking requirement — score every registered theme,
// filter to those clearing MINIMUM_COMPATIBILITY_SCORE, sort descending.
// An empty result means "no theme is compatible" — the caller's job is to
// return THEME_NOT_FOUND, never to force the highest-scoring-but-still-bad
// option through.
export function rankThemes(
  themes: ThemeDefinition[],
  input: CompatibilityScoringInput,
): RankedTheme[] {
  return themes
    .map((theme) => ({ theme, breakdown: scoreThemeCompatibility(theme, input) }))
    .filter((entry) => entry.breakdown.compositeScore >= MINIMUM_COMPATIBILITY_SCORE)
    .sort((a, b) => b.breakdown.compositeScore - a.breakdown.compositeScore);
}
