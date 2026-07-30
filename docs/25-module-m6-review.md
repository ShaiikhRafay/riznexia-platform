# Module Review Report — M6: AI Business Analyzer

**Status:** Implementation complete, pending founder approval
**Date:** 2026-07-30
**Reviewed against:** `docs/21-implementation-roadmap.md` (frozen roadmap, M1–M12), the M6 module brief (architecture presented and approved before implementation, then refined by ten mandatory architecture requirements and a final set of schema/permission/cache decisions)

---

## 1. Scope Compliance

| Requirement                                                                                                               | Delivered                                        | Where                                                                                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AI provider abstraction                                                                                                   | ✅                                               | `AiTextProvider` interface, `AI_TEXT_PROVIDER` DI token, `AnthropicProvider` the sole implementation                                                                                                                             |
| Support for Claude/OpenAI/Gemini/DeepSeek/Local LLMs                                                                      | ✅ (Claude implemented; others forward-declared) | `AiProviderName` Prisma enum names every provider; only `AnthropicProvider` is built, per M5's `LocationProvider` precedent                                                                                                      |
| Prompt versioning                                                                                                         | ✅                                               | `PromptRegistry`, versioned template module (`business-analysis/v1.0.ts`), `promptName`/`promptVersion`/`promptHash` recorded per analysis                                                                                       |
| Prompt templates externalized, not hardcoded in business logic                                                            | ✅                                               | Templates live in `packages/ai/src/prompt/`, never inlined in `AiService`/the runner                                                                                                                                             |
| AI result cache                                                                                                           | ✅                                               | `computeBusinessFingerprint()` vs. latest `COMPLETED` analysis's `inputHash`; cache hit skips the AI call entirely                                                                                                               |
| Cache invalidation on business-data change                                                                                | ✅                                               | Fingerprint covers name/category/rating/reviewCount/reviews/website/phone/address/photos/`syncVersion`; `syncVersion` alone is already sufficient since every listed field is written through the same upsert path that bumps it |
| Analysis versioning, never overwritten                                                                                    | ✅                                               | `analysisVersion` unique per `businessId`, `@@unique([businessId, analysisVersion])`, every trigger creates a new row                                                                                                            |
| Analysis record fields (version/promptVersion/promptHash/provider/model/executionTime/completedAt/confidence/tokens/cost) | ✅                                               | All present as typed `BusinessAnalysis` columns                                                                                                                                                                                  |
| JSON Schema validation, strict                                                                                            | ✅                                               | `ResponseValidator` (Zod, `businessAnalysisOutputSchema`), never trusts raw AI output                                                                                                                                            |
| Repair-prompt retry on validation failure                                                                                 | ✅                                               | `AiService.analyzeBusiness()`'s 3-attempt ladder                                                                                                                                                                                 |
| Never persist invalid structured data                                                                                     | ✅                                               | `brandBrief` stays `null` on `FAILED`; `rawResponse`+`validationErrors` stored instead                                                                                                                                           |
| Cost tracking (provider/model/tokens/cost/duration)                                                                       | ✅                                               | Recorded per analysis; aggregate ceiling enforced via `CostService.charge()`                                                                                                                                                     |
| Retry strategy — transient failures only, exponential backoff, max 2                                                      | ✅                                               | `withExponentialBackoff` (`packages/ai/src/utils/retry.ts`), wraps each individual provider call, kept separate from the validation-repair ladder                                                                                |
| Logging (started/completed/failed/cache hit/miss/provider error/validation failure/retry/cost/execution time)             | ✅                                               | `AiService` event emission (`retry_attempt`/`repair_prompt_sent`/`validation_failure`/`provider_error`) + `BusinessAnalysisRunnerService`/`BusinessAnalysisService` structured `Logger` calls for every named event              |
| Data source for future M7/M8 with no redesign needed                                                                      | ✅ (by design)                                   | `brandBrief`'s 19 fields map directly to what Doc 20 §7/§8 describe M7/M8 consuming; `packages/ai` given a real build step specifically so it's importable outside `apps/api`                                                    |
| Unit tests                                                                                                                | ✅                                               | 24 new `apps/api` tests + 1 new permission assertion (307 total, up from 282); 19 new `packages/ai` tests; 11 new `packages/shared-types` tests (76 total, up from 65)                                                           |
| Integration tests                                                                                                         | ✅                                               | 11 new (`business-analysis.e2e-spec.ts`, 93 e2e total, up from 82)                                                                                                                                                               |

**Constraints honored:** no website generation, theme selection, CRM UI, or frontend code anywhere in this change. Verified by `git diff` scope (touches only `packages/db`, `packages/shared-types`, `packages/ai`, `apps/api`).

**Roadmap frozen, not touched:** `docs/21-implementation-roadmap.md`'s module list, order, and numbering are unchanged. Only M6's own **Objective**/**Tasks**/**Status**/**Risks**/**Testing Strategy**/**Definition of Done** fields were updated — same treatment M3/M4/M5's entries got after those modules shipped.

## 2. Pre-Implementation Architecture Review

Per the brief's own explicit process gate ("design the complete AI architecture... wait for my approval before writing code"), the plan went through two rounds before implementation started:

1. **Initial architecture plan**, covering the `AiTextProvider` interface, `packages/ai` structure, the `BusinessAnalysis` schema-shape question, prompt versioning strategy, retry/escalation logic, cost tracking, and the API contract — presented and approved with one flagged open question (schema shape: typed columns vs. Json blob).
2. **Ten mandatory architecture requirements**, specified directly rather than surfaced as ambiguities: prompt versioning (name/version/hash/provider/model per analysis), an AI result cache keyed to business-data change, analysis versioning with full historical retention, the provider abstraction, strict JSON Schema validation with a repair-prompt ladder, cost tracking, a bounded retry strategy, structured logging, forward compatibility for M7/M8, and explicit scope constraints — all incorporated into the design before implementation began.
3. **Final decisions**, resolving the one open schema-shape question (typed columns for metadata/lifecycle, `brandBrief` stays `Json`) and the permission question (`business:analyze`, dedicated, not a reuse of `leads:write`) explicitly, plus the exact cache-invalidation rule.

Full reasoning for each: `DECISIONS.md` D-037 through D-043.

One thing was found and fixed during implementation, not silently worked around: `AiModule`'s initial `ConfigService.getOrThrow('ANTHROPIC_API_KEY')` crashed every pre-existing e2e suite that boots `AppModule` without that env var — corrected to the same tolerant-at-boot `.get()` convention `PlacesAdapter` already established for `GOOGLE_PLACES_API_KEY` (D-037's own-judgment note).

## 3. Implementation Summary

**Provider abstraction (`packages/ai/src/provider/`):** `ai-text-provider.interface.ts` (`AiTextProvider`, `AI_TEXT_PROVIDER` token, `AiCompletionRequest`/`AiCompletionResult`), `anthropic.provider.ts` (`AnthropicProvider`, wraps `@anthropic-ai/sdk`), `model.constants.ts` (`STANDARD_MODEL`/`ESCALATION_MODEL`/`DEFAULT_MAX_TOKENS`/`DEFAULT_TIMEOUT_MS`).

**Prompt layer (`packages/ai/src/prompt/`):** `business-analysis/v1.0.ts` (system prompt, delimited `<business_data>` block, response-schema instructions, repair-prompt builder, load-time-computed `PROMPT_HASH`), `prompt-registry.ts` (`PromptRegistry`, always resolves to the current version).

**Validation (`packages/ai/src/validator/`):** `response-validator.ts` — strips a stray markdown fence, parses JSON, validates against `businessAnalysisOutputSchema` + `confidenceScore`, never throws.

**Gateway (`packages/ai/src/gateway/`):** `ai.service.ts` — `AiService.analyzeBusiness()`, the full retry/escalation ladder plus structured event emission, framework- and Prisma-free.

**Utilities (`packages/ai/src/utils/`):** `retry.ts` — `withExponentialBackoff`, separate from M5's linear-backoff `withRetry`.

**Schema (`packages/db/prisma/schema.prisma`, migration `20260730020000_m6_ai_business_analyzer`):**

- Two new enums: `AnalysisStatus`, `AiProviderName`.
- `BusinessAnalysis` expanded from `{brandBrief, sentimentSummary, aiModelUsed}` to the full typed set described in D-038.
- Migration hand-authored (no live database in this environment, same constraint as every prior module) — additive-then-backfill-then-constrain, non-destructive per the founder's explicit requirement.

**Contracts (`packages/shared-types/src/business-analysis.ts`):** `businessAnalysisOutputSchema` (the 19-field brief), `businessAnalysisSchema` (the full API response shape), `ANALYSIS_STATUSES`, `AI_PROVIDERS`.

**Services (`apps/api/src/business-analysis/`):**

- `business-fingerprint.ts` — `computeBusinessFingerprint()`.
- `business-analysis.service.ts` — cache check, `analysisVersion` allocation inside a transaction, `PENDING` row creation, fire-and-forget dispatch (D-004 precedent).
- `business-analysis-runner.service.ts` — pre-flight cost reservation, `AiService` call, persistence of `COMPLETED`/`FAILED`, real-cost computation from actual token counts.
- `business-analysis.controller.ts` — `GET/POST /leads/:id/business`, `business:analyze` on POST, `leads:read` on GET, `@Audited()` on the trigger route.
- `dto/business-analysis-response.dto.ts` — Prisma-to-API enum mapping.

**DI wiring:** `apps/api/src/common/ai/ai.module.ts` (`AiModule`) — the single point that provides `AI_TEXT_PROVIDER`/`AiService`; `BusinessAnalysisModule` imports it alongside `BusinessModule`/`LeadsModule`; wired into `AppModule`.

**Logging:** `Logger` on `BusinessAnalysisService`/`BusinessAnalysisRunnerService`, matching every prior module's convention; `AiService`'s event callback lets the runner forward package-level events (retry/repair/validation-failure/provider-error) into its own `Logger` with businessId/analysisId context.

## 4. Test Coverage

| Suite                                                   | Tests | Notes                                                                                                                                                        |
| ------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `packages/shared-types` (`business-analysis.test.ts`)   | 11    | 19-field output schema, full `BusinessAnalysis` response shape incl. pending/failed variants                                                                 |
| `packages/ai` (`response-validator.test.ts`)            | 6     | Valid payload, markdown-fence stripping, malformed JSON, missing field, out-of-range confidence, never-throws                                                |
| `packages/ai` (`retry.test.ts`)                         | 3     | First-try success, retry-then-succeed, exhausted-retries throws                                                                                              |
| `packages/ai` (`ai.service.test.ts`)                    | 6     | First-attempt success, same-model repair recovery, escalation-model recovery, full-ladder failure, event ordering, transient-error propagation (fake timers) |
| `packages/ai` (`anthropic.provider.test.ts`)            | 4     | Name, response mapping, request pass-through, empty-text fallback                                                                                            |
| `apps/api` (`business-fingerprint.spec.ts`)             | 5     | Determinism, `syncVersion`/rating/`placesData` sensitivity, unrelated-field insensitivity                                                                    |
| `apps/api` (`business-analysis.service.spec.ts`)        | 9     | `LeadNotFoundException`/`BusinessNotFoundException`, cache hit vs. miss, `analysisVersion` allocation, fire-and-forget dispatch                              |
| `apps/api` (`business-analysis-runner.service.spec.ts`) | 6     | Success persistence, model-tier cost difference, failure persistence, rawResponse truncation, quota-exceeded short-circuit, provider-exception handling      |
| `apps/api` (`business-analysis.controller.spec.ts`)     | 4     | GET delegation (incl. null), 200 vs. 202 status selection                                                                                                    |
| `apps/api` (`permission.constants.spec.ts`, extended)   | +1    | `business:analyze` granted to the same roles as `discovery:run`                                                                                              |
| `apps/api/test/business-analysis.e2e-spec.ts`           | 11    | Auth, RBAC (POST needs `business:analyze`, GET needs only `leads:read`), cache hit/miss end-to-end, 404s, non-UUID validation                                |

**Totals:** `apps/api` unit 307/307 passing (up from 282), e2e 93/93 passing (up from 82). `packages/ai` 19/19 passing (new package). `packages/shared-types` 76/76 passing (up from 65). Full monorepo typecheck/lint clean for `apps/api`, `packages/db`, `packages/shared-types`, `packages/ai`.

## 5. Security Review

- **AuthN unchanged** — Clerk remains the sole authentication provider (no code touched here).
- **AuthZ** — `POST /leads/:id/business` requires the new `business:analyze` permission (granted to the same roles as `discovery:run` — withheld from Viewer/Developer); `GET /leads/:id/business` requires only `leads:read`. Verified in `business-analysis.e2e-spec.ts` (a Viewer gets 403 on POST, 200 on GET).
- **Cost governance** — `CostService.charge()`'s existing atomic reserve-then-log pattern (D-010) is reused as-is for a conservative pre-flight reservation; a quota-exceeded pre-flight failure marks the analysis `FAILED` without ever calling the AI provider.
- **Prompt injection** — every piece of business data (including free-text review snippets inside the raw Places payload) is wrapped in an explicitly delimited `<business_data>` block in the user prompt, with a system-prompt instruction to treat that block as data, never as instructions.
- **No secrets/PII newly logged** — log lines carry only businessId/analysisId/model/token-count/error-message values, consistent with Doc 15 §3/§7; the raw AI response is only ever persisted to the database (`rawResponse`, truncated to 64KB, `FAILED` rows only), never logged in full.
- **API key handling** — `ANTHROPIC_API_KEY` resolved via `ConfigService`, same pattern as every other credential in this codebase; never logged, never returned in any response.

## 6. Known Limitations (flagged, not hidden)

- The migration has not been run against a real Postgres instance — this environment has no live database, same constraint as every prior module's migration (D-020, D-024, D-029, M5).
- No AI regression eval harness against golden business fixtures (Doc 13 §2) — this environment has no live `ANTHROPIC_API_KEY`/network access to run real Claude calls against; the retry/escalation/validation logic is fully covered by mocked-provider unit tests instead.
- `AiModule` resolves `ANTHROPIC_API_KEY` tolerantly at boot (`.get() ?? ''`) rather than failing fast — a genuinely missing key in a real deployment surfaces as an Anthropic SDK auth error on the first actual analysis trigger, not at server startup. This matches the existing `GOOGLE_PLACES_API_KEY` convention exactly; flagged as a deliberate consistency choice, not an oversight.
- `OpenAiProvider`/`GeminiProvider`/`DeepSeekProvider`/`LocalLlmProvider` are named in the `AiProviderName` enum but not implemented — explicitly out of scope, matching M5's treatment of unbuilt location providers.

## 7. Approval Checklist

- [x] Architecture reviewed before implementation; two rounds of requirements (initial plan, then ten mandatory requirements) incorporated before code was written
- [x] Roadmap not renamed/reordered/merged/split — only M6's own status fields updated
- [x] All stated requirements delivered, including every named architecture requirement (prompt versioning, cache, analysis versioning, provider abstraction, JSON Schema validation, cost tracking, retry strategy, logging, forward compatibility, scope constraints)
- [x] All stated constraints honored (no website generation, no theme selection, no CRM UI, no frontend)
- [x] Full test suite green (307 unit + 93 e2e in `apps/api`; 19 in `packages/ai`; 76 in `packages/shared-types`)
- [x] Full monorepo typecheck/lint clean for every touched package
- [x] TASKS.md, CHANGELOG.md, DECISIONS.md, docs/21 M6 entry updated
- [x] Self-review complete, this report generated

**Awaiting founder approval before Module M7.**
