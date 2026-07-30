// Module M6 — Doc 20 §6's retry ladder is a two-tier model strategy by
// design (initial attempt on the standard model, escalate to a stronger
// model only after a same-model validation failure) — not a cost-driven
// downgrade decided here. ESCALATION_MODEL must be strictly stronger than
// STANDARD_MODEL or the escalation step in AiService.analyze() is a no-op.
export const STANDARD_MODEL = 'claude-sonnet-5';
export const ESCALATION_MODEL = 'claude-opus-5';

export const DEFAULT_MAX_TOKENS = 4096;
export const DEFAULT_TIMEOUT_MS = 30_000;
