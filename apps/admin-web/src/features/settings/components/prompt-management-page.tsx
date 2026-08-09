'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@riznexia/ui';
import Link from 'next/link';
import { NotConfigurable, NotConfigurableField } from './not-configurable';
import { SettingsAccessGate } from './settings-access-gate';
import { SettingsSubNav } from './settings-sub-nav';

// Prompt Management (F13): M6's `PromptRegistry` (`packages/ai/src/prompt/`)
// really does version every prompt (`promptName`/`promptVersion`/
// `promptHash`, SHA-256 computed at load) and `BusinessAnalysis` really
// does persist those fields per analysis row — but no endpoint anywhere
// lists them globally; `GET /leads/:id/business` only returns one lead's
// latest analysis. Building a fake "all prompt versions" table here would
// mean inventing an endpoint that doesn't exist. The real per-lead data is
// already visible in F6's own Business Analysis screen — linked below
// rather than duplicated (D-199).
export function PromptManagementPage() {
  return (
    <SettingsAccessGate>
      <div className="flex flex-col gap-6">
        <SettingsSubNav />
        <h1 className="text-h1 text-(--color-text-primary) font-semibold">Prompt Management</h1>

        <Card>
          <CardHeader>
            <CardTitle className="text-h2 text-(--color-text-primary) font-semibold">
              M6 Prompt Versioning Architecture
            </CardTitle>
          </CardHeader>
          <CardContent className="text-(--color-text-secondary) text-sm">
            Every AI Business Analysis records its Prompt Name, Prompt Version, Prompt Hash, Status,
            Provider, Model, and Created Date — but only per lead, not as a global registry. There
            is no backend endpoint that lists prompt versions across every lead.
          </CardContent>
        </Card>

        <NotConfigurable title="Global Prompt Registry">
          <p className="mb-3">Not available as a global view — no list endpoint exists yet.</p>
          <div className="flex flex-col gap-2">
            <NotConfigurableField label="Prompt Name" />
            <NotConfigurableField label="Prompt Version" />
            <NotConfigurableField label="Prompt Hash" />
            <NotConfigurableField label="Status" />
            <NotConfigurableField label="Provider" />
            <NotConfigurableField label="Model" />
            <NotConfigurableField label="Created Date" />
          </div>
          <p className="mt-3">
            <Link href="/business-analysis" className="text-(--color-accent) hover:underline">
              View per-lead prompt metadata in Business Analysis →
            </Link>
          </p>
        </NotConfigurable>
      </div>
    </SettingsAccessGate>
  );
}
