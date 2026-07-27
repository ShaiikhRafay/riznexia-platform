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
