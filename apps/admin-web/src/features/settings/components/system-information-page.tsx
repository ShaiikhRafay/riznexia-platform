'use client';

import { Card, CardContent, CardHeader, CardTitle, StatusBadge } from '@riznexia/ui';
import { useHealth } from '../api/use-health';
import { NotConfigurableField } from './not-configurable';
import { SettingsAccessGate } from './settings-access-gate';
import { SettingsSubNav } from './settings-sub-nav';

// System Information (F13): `GET /health` is the only real, live signal
// available — a plain reachability + timestamp check. Application Version,
// Build Version, Git Commit, Environment, Database Status, Cache Status,
// and Backend Version have no backing endpoint anywhere in this codebase
// (`HealthController` returns exactly `{status, timestamp}`) — shown as
// "Not available" rather than a guessed or hard-coded value that could go
// stale the moment the backend actually deploys something different
// (D-204).
export function SystemInformationPage() {
  const { data, error, dataUpdatedAt } = useHealth();

  return (
    <SettingsAccessGate>
      <div className="flex flex-col gap-6">
        <SettingsSubNav />
        <h1 className="text-h1 text-(--color-text-primary) font-semibold">System Information</h1>

        <Card>
          <CardHeader>
            <CardTitle className="text-h2 text-(--color-text-primary) font-semibold">
              API Status
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-(--color-text-secondary)">Status</span>
              {error ? (
                <StatusBadge variant="danger" label="Unreachable" />
              ) : data ? (
                <StatusBadge variant="success" label="Reachable" />
              ) : (
                <StatusBadge variant="neutral" label="Checking…" />
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-(--color-text-secondary)">Server Timestamp</span>
              <span className="text-(--color-text-primary)">{data?.timestamp ?? '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-(--color-text-secondary)">Last Checked</span>
              <span className="text-(--color-text-primary)">
                {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : '—'}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-caption text-(--color-text-secondary) font-medium">
              Not Exposed by Any Endpoint
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <NotConfigurableField label="Application Version" />
            <NotConfigurableField label="Build Version" />
            <NotConfigurableField label="Git Commit" />
            <NotConfigurableField label="Environment" />
            <NotConfigurableField label="Database Status" />
            <NotConfigurableField label="Cache Status" />
            <NotConfigurableField label="Backend Version" />
          </CardContent>
        </Card>
      </div>
    </SettingsAccessGate>
  );
}
