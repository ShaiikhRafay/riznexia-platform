'use client';

import { AuditLogsPage } from '@/src/features/analytics/components/audit-logs-page';
import { SettingsAccessGate } from './settings-access-gate';
import { SettingsSubNav } from './settings-sub-nav';

// Audit History (F13): "Reuse existing audit APIs. Never build a second
// audit system." — this renders F12's own `AuditLogsPage` verbatim
// (`GET /analytics/reports/audit`, gated `analytics:report` internally by
// that component itself). Zero duplicate table/column/pagination logic;
// the only thing this file adds is the Settings section's own nav/access
// gate wrapper (D-205).
export function SettingsAuditHistoryPage() {
  return (
    <SettingsAccessGate>
      <div className="flex flex-col gap-6">
        <SettingsSubNav />
        <AuditLogsPage />
      </div>
    </SettingsAccessGate>
  );
}
