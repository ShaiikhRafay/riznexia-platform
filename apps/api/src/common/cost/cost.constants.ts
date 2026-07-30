// Estimated per-call cost, USD. Named constants rather than inline magic
// numbers specifically so correcting a figure once real Google Places API
// (New) pricing is confirmed is a one-line change, not a search-and-replace
// across the codebase — see Doc 22 §9's caveat and DECISIONS.md D-007.
export const PLACES_SEARCH_COST_USD = 0.032; // Text Search, per request (up to 20 results/page)
export const PLACES_WEBSITE_CHECK_COST_USD = 0.005; // Place Details, minimal field mask
export const PLACES_FULL_DETAILS_COST_USD = 0.017; // Place Details, full field mask (reviews/photos)

// Doc 04 §10 — org-wide starting policy, overridable via
// MONTHLY_COST_CEILING_USD. Enforced as a hard stop at 100%; a warning is
// logged at 80% utilization (alerting-integration hook, not a block).
export const DEFAULT_MONTHLY_COST_CEILING_USD = 300;
export const QUOTA_WARNING_THRESHOLD = 0.8;

// Per-rep quotas are intentionally not enforced yet — no specific per-rep
// dollar figure has been approved (only the org-wide $300/month ceiling
// has), and inventing one here would mean enforcing a number nobody signed
// off on. Doc 22 §12 flags per-rep limiting as part of the design; the
// actual figure is a founder decision for a later pass.

// Module M6 — Claude Sonnet 5 / Opus 5 per-1M-token list pricing (Doc 21 M6
// entry), used to compute estimatedCost from actual promptTokens/
// completionTokens rather than charging a flat per-call estimate — unlike
// M5's PLACES_*_COST_USD constants, an LLM call's real cost varies
// enormously with output length, so a fixed per-call figure would be a
// much worse approximation here.
export const CLAUDE_SONNET_INPUT_COST_PER_MTOK_USD = 3.0;
export const CLAUDE_SONNET_OUTPUT_COST_PER_MTOK_USD = 15.0;
export const CLAUDE_OPUS_INPUT_COST_PER_MTOK_USD = 5.0;
export const CLAUDE_OPUS_OUTPUT_COST_PER_MTOK_USD = 25.0;

// CostService.charge() must reserve *before* the external call it
// corresponds to (D-010) — but unlike a Places API call, an LLM call's
// real cost isn't knowable until it returns (it varies with output
// length and which of up to 3 retry-ladder attempts actually ran). This
// is a conservative pre-flight reservation sized for the worst case (3
// attempts, each up to packages/ai's DEFAULT_MAX_TOKENS output, on the
// escalation-tier model) — it guards the monthly ceiling the same way
// every other charge() call does; the *actual* cost computed from real
// token counts is what's persisted on the BusinessAnalysis row itself
// (estimatedCost), not re-reconciled against this reservation.
export const AI_BUSINESS_ANALYSIS_ESTIMATED_COST_USD = 0.35;

// Module M7 (DECISIONS.md D-048) — same reserve-before-call rationale as
// above, sized much smaller: `recommendThemeCategory()` is a single
// attempt, standard-model-only, transient-retried but never
// repair/escalated (D-046), with a small classification prompt — nowhere
// near AI_BUSINESS_ANALYSIS_ESTIMATED_COST_USD's worst-case 3-attempt
// Opus-tier budget.
export const AI_THEME_RECOMMENDATION_ESTIMATED_COST_USD = 0.02;
