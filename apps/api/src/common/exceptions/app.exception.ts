import { HttpException, HttpStatus } from '@nestjs/common';

// Base for every typed domain exception in the app. The global exception
// filter (common/filters/http-exception.filter.ts) reads `.code` to build
// the error envelope from docs/19-api-architecture.md §4 — no exception
// should be thrown as a bare string-matched Error (Doc 12 §5).
export class AppException extends HttpException {
  public readonly code: string;

  constructor(
    code: string,
    message: string,
    status: HttpStatus,
    details?: Record<string, unknown>,
  ) {
    super({ code, message, details }, status);
    this.code = code;
  }
}

export class UnauthenticatedException extends AppException {
  constructor(message = 'Missing or invalid authentication token') {
    super('UNAUTHENTICATED', message, HttpStatus.UNAUTHORIZED);
  }
}

export class ForbiddenRoleException extends AppException {
  constructor(message = 'Your role does not permit this action') {
    super('FORBIDDEN', message, HttpStatus.FORBIDDEN);
  }
}

// Module M3 (DECISIONS.md D-023) — distinct from ForbiddenRoleException:
// that one fires on an exact-role-list (`@Roles()`) or hierarchy-threshold
// (`@MinRole()`) mismatch, this one on a fine-grained permission
// (`@RequirePermissions()`) mismatch. Same `FORBIDDEN` code and 403 status
// (Doc 19 §4 doesn't distinguish these at the API-contract level — the
// distinction is internal, for clearer server-side logs/messages only).
export class ForbiddenPermissionException extends AppException {
  constructor(message = 'Your role does not have the required permission for this action') {
    super('FORBIDDEN', message, HttpStatus.FORBIDDEN);
  }
}

export class InvalidWebhookSignatureException extends AppException {
  constructor(message = 'Invalid webhook signature') {
    super('INVALID_WEBHOOK_SIGNATURE', message, HttpStatus.UNAUTHORIZED);
  }
}

// Doc 19 §4 — a third-party API call failed after retries (or failed with
// a non-retryable provider error). Reused across every external adapter
// (Places today; GitHub/Vercel/image-gen later), not just this module's.
export class UpstreamProviderException extends AppException {
  constructor(provider: string, message: string, details?: Record<string, unknown>) {
    super('UPSTREAM_PROVIDER_ERROR', `${provider}: ${message}`, HttpStatus.BAD_GATEWAY, details);
  }
}

// Doc 19 §4 — per-rep or org-wide cost/usage ceiling reached (Doc 04 §10,
// BRD BR-7).
export class QuotaExceededException extends AppException {
  constructor(message = 'Monthly cost ceiling reached') {
    super('QUOTA_EXCEEDED', message, HttpStatus.TOO_MANY_REQUESTS);
  }
}

// ---------- Module M4 — Lead Management (Doc 19 §4) ----------
// These give the resource-specific 404 codes Doc 19's catalog already
// documents (`LEAD_NOT_FOUND`, `TEAM_MEMBER_NOT_FOUND`) instead of the
// generic `RESOURCE_NOT_FOUND` a bare NestJS NotFoundException produces.

export class LeadNotFoundException extends AppException {
  constructor(message = 'Lead not found') {
    super('LEAD_NOT_FOUND', message, HttpStatus.NOT_FOUND);
  }
}

export class BusinessNotFoundException extends AppException {
  constructor(message = 'Business not found') {
    super('BUSINESS_NOT_FOUND', message, HttpStatus.NOT_FOUND);
  }
}

export class TeamMemberNotFoundException extends AppException {
  constructor(message = 'Team member not found') {
    super('TEAM_MEMBER_NOT_FOUND', message, HttpStatus.NOT_FOUND);
  }
}

// Doc 19 §4 lists this as the dedupe conflict on `google_place_id`. Module
// M2 moved that unique constraint onto `Business`, so at the Lead layer the
// equivalent conflict is "this business is already being pursued" —
// `Lead.businessId` is unique, one pursuit per business.
export class DuplicateLeadException extends AppException {
  constructor(message = 'A lead already exists for this business') {
    super('DUPLICATE_LEAD', message, HttpStatus.CONFLICT);
  }
}

// Doc 19 §1/§4 — `?sort=` referenced a field outside the endpoint's
// whitelist. Deliberately its own code rather than a generic
// VALIDATION_ERROR, because the documented contract distinguishes them.
export class InvalidSortFieldException extends AppException {
  constructor(field: string, allowed: readonly string[]) {
    super('INVALID_SORT_FIELD', `Cannot sort by '${field}'`, HttpStatus.BAD_REQUEST, {
      allowed: [...allowed],
    });
  }
}

// ---------- Module M5 — Google Places Synchronization (Doc 19 §4) ----------

export class PlaceSyncJobNotFoundException extends AppException {
  constructor(message = 'Place sync job not found') {
    super('PLACE_SYNC_JOB_NOT_FOUND', message, HttpStatus.NOT_FOUND);
  }
}

// ---------- Module M6 — AI Business Analyzer (Doc 19 §4) ----------

export class BusinessAnalysisNotFoundException extends AppException {
  constructor(message = 'Business analysis not found') {
    super('BUSINESS_ANALYSIS_NOT_FOUND', message, HttpStatus.NOT_FOUND);
  }
}

// ---------- Module M7 — Theme Engine (Doc 19 §4) ----------

// Founder's explicit gate: "If no theme reaches the minimum compatibility
// score, return THEME_NOT_FOUND. Do not guess. Do not force an
// incompatible theme." Thrown by ThemeSelectionService when
// rankThemes() returns an empty list — every registered theme scored
// below MINIMUM_COMPATIBILITY_SCORE.
export class ThemeNotFoundException extends AppException {
  constructor(message = 'No theme meets the minimum compatibility score for this business') {
    super('THEME_NOT_FOUND', message, HttpStatus.NOT_FOUND);
  }
}

// ---------- Module M8.1 — Layout Generator (Doc 19 §4) ----------

// The Layout Generator has a hard dependency on a persisted ThemeConfiguration
// (its second required input, alongside BusinessAnalysis) — mirrors
// BusinessAnalysisNotFoundException's role for M7's own hard dependency on
// M6.
export class ThemeConfigurationNotFoundException extends AppException {
  constructor(
    message = 'No theme configuration exists yet for this lead — run theme selection (POST /leads/:id/theme) before layout generation',
  ) {
    super('THEME_CONFIGURATION_NOT_FOUND', message, HttpStatus.NOT_FOUND);
  }
}

// ---------- Module M8.2 — Component Generator (Doc 19 §4) ----------

// The Component Generator has a hard dependency on a persisted
// LayoutConfiguration (its third required input, alongside BusinessAnalysis
// and ThemeConfiguration) — mirrors ThemeConfigurationNotFoundException's
// role for M8.1's own hard dependency on M7.
export class LayoutConfigurationNotFoundException extends AppException {
  constructor(
    message = 'No layout configuration exists yet for this lead — run layout generation (POST /leads/:id/layout) before component generation',
  ) {
    super('LAYOUT_CONFIGURATION_NOT_FOUND', message, HttpStatus.NOT_FOUND);
  }
}

// ---------- Module M8.3 — Content Binding (Doc 19 §4) ----------

// Content Binding has a hard dependency on a persisted ComponentManifest
// (its fourth required input, alongside BusinessAnalysis/ThemeConfiguration/
// LayoutConfiguration) — mirrors LayoutConfigurationNotFoundException's
// role for M8.2's own hard dependency on M8.1.
export class ComponentManifestNotFoundException extends AppException {
  constructor(
    message = 'No component manifest exists yet for this lead — run component generation (POST /leads/:id/components) before content binding',
  ) {
    super('COMPONENT_MANIFEST_NOT_FOUND', message, HttpStatus.NOT_FOUND);
  }
}

// ---------- Module M8.4 — Website Assembly (Doc 19 §4) ----------

// Website Assembly has a hard dependency on a persisted ContentManifest
// (its fifth required input, alongside BusinessAnalysis/ThemeConfiguration/
// LayoutConfiguration/ComponentManifest) — mirrors ComponentManifestNotFoundException's
// role for M8.3's own hard dependency on M8.2.
export class ContentManifestNotFoundException extends AppException {
  constructor(
    message = 'No content manifest exists yet for this lead — run content binding (POST /leads/:id/content) before website assembly',
  ) {
    super('CONTENT_MANIFEST_NOT_FOUND', message, HttpStatus.NOT_FOUND);
  }
}

// ---------- Module M9 — Website Preview (Doc 19 §4) ----------

// Website Preview has a hard dependency on a persisted GeneratedWebsite
// (its primary input, alongside BusinessAnalysis/ThemeConfiguration) —
// mirrors ContentManifestNotFoundException's role for M8.4's own hard
// dependency on M8.3.
export class GeneratedWebsiteNotFoundException extends AppException {
  constructor(
    message = 'No generated website exists yet for this lead — run website assembly (POST /leads/:id/website) before previewing it',
  ) {
    super('GENERATED_WEBSITE_NOT_FOUND', message, HttpStatus.NOT_FOUND);
  }
}
