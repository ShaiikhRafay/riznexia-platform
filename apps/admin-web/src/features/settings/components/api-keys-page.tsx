'use client';

import { NotConfigurable, NotConfigurableField } from './not-configurable';
import { SettingsAccessGate } from './settings-access-gate';
import { SettingsSubNav } from './settings-sub-nav';

// API Keys (F13): the backend has no key-management model or endpoint
// anywhere — every provider credential (`ANTHROPIC_API_KEY`,
// `GOOGLE_PLACES_API_KEY`, `VERCEL_API_TOKEN`, `GITHUB_APP_PRIVATE_KEY`,
// `R2_*`, `TRIGGER_API_KEY`, `SENTRY_DSN`) is a server-only environment
// variable read directly by `ConfigService` (`apps/api/.env.example`).
// There is nothing to fetch, mask, or update via API, so this page is
// entirely informative — never a fake masked-value list (D-198).
export function ApiKeysPage() {
  return (
    <SettingsAccessGate>
      <div className="flex flex-col gap-6">
        <SettingsSubNav />
        <h1 className="text-h1 text-(--color-text-primary) font-semibold">API Keys</h1>

        <NotConfigurable title="API Key Management">
          <p className="mb-3">
            The backend does not expose an API key management endpoint. Provider credentials are
            configured as server environment variables and can only be changed by an engineer with
            deployment access to <code>apps/api</code>.
          </p>
          <div className="flex flex-col gap-2">
            <NotConfigurableField label="Anthropic (AI Provider)" />
            <NotConfigurableField label="Google Places" />
            <NotConfigurableField label="Vercel (Deployment)" />
            <NotConfigurableField label="GitHub App" />
            <NotConfigurableField label="Cloudflare R2 (Storage)" />
          </div>
        </NotConfigurable>
      </div>
    </SettingsAccessGate>
  );
}
