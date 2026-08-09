'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@riznexia/ui';
import { NotConfigurable } from './not-configurable';
import { SettingsAccessGate } from './settings-access-gate';
import { SettingsSubNav } from './settings-sub-nav';

// Analytics Settings (F13): M12 has zero configuration surface — no
// retention, threshold, or export-format setting is stored or readable
// anywhere. The two facts below are real, verifiable product behavior
// (`ExportEngineService` hard-codes a 1000-row cap; `pdf`/`excel` are
// accepted by the request schema but rejected with
// `EXPORT_FORMAT_NOT_IMPLEMENTED` before any report runs), not invented
// settings — stated as fixed system facts, not editable fields (D-203).
export function AnalyticsSettingsPage() {
  return (
    <SettingsAccessGate>
      <div className="flex flex-col gap-6">
        <SettingsSubNav />
        <h1 className="text-h1 text-(--color-text-primary) font-semibold">Analytics Settings</h1>

        <Card>
          <CardHeader>
            <CardTitle className="text-h2 text-(--color-text-primary) font-semibold">
              Fixed System Behavior
            </CardTitle>
          </CardHeader>
          <CardContent className="text-(--color-text-secondary) flex flex-col gap-2 text-sm">
            <p>Export format: CSV only. PDF and Excel are reserved but not implemented.</p>
            <p>Export row cap: 1,000 rows per export.</p>
            <p>
              Reports and dashboards recompute on every request — no server-side caching is wired
              yet.
            </p>
          </CardContent>
        </Card>

        <NotConfigurable title="Configurable Settings">
          <p>
            No retention, threshold, or export-format configuration endpoint exists — these values
            cannot be changed from this dashboard.
          </p>
        </NotConfigurable>
      </div>
    </SettingsAccessGate>
  );
}
