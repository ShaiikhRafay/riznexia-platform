'use client';

import type { CrmSettings } from '@riznexia/shared-types';
import { ErrorState, Skeleton } from '@riznexia/ui';
import { PermissionGate } from '@/src/components/auth/permission-gate';
import { DetailCard, FieldRow } from '@/src/features/analytics/components/detail-primitives';
import { useCrmSettings } from '../api/use-crm-settings';
import { CompanySettingsForm } from './company-settings-form';
import { NotConfigurable, NotConfigurableField } from './not-configurable';
import { SettingsAccessGate } from './settings-access-gate';
import { SettingsSubNav } from './settings-sub-nav';

// Company Settings (F13): `GET /crm/settings` (M10's singleton row) is the
// only real "company-level" configuration the backend exposes — gated
// `crm:view` to read, `crm:manage` to edit (exact backend permission split,
// D-196). Company Name/Logo/Email/Phone/Website/Address have no
// backing model anywhere in the schema (no `Organization`/`Company` table
// exists — see the commented-out `Organization` model, M3 D-027) — shown
// as `NotConfigurable`, never fabricated.
export function CompanySettingsPage() {
  return (
    <SettingsAccessGate>
      <div className="flex flex-col gap-6">
        <SettingsSubNav />
        <h1 className="text-h1 text-(--color-text-primary) font-semibold">Company Settings</h1>

        <PermissionGate
          permission="crm:view"
          fallback={
            <p className="text-(--color-text-secondary) text-sm">
              You don&rsquo;t have permission to view company settings.
            </p>
          }
        >
          <CompanySettingsContent />
        </PermissionGate>
      </div>
    </SettingsAccessGate>
  );
}

function CompanySettingsContent() {
  const { data, isLoading, error, refetch } = useCrmSettings();

  if (isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }
  if (error) {
    return <ErrorState error={error} onRetry={() => void refetch()} />;
  }
  if (!data) {
    return null;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <DetailCard title="Configured (M10 CRM Settings)">
        <PermissionGate permission="crm:manage" fallback={<ReadOnlyView settings={data} />}>
          <CompanySettingsForm settings={data} />
        </PermissionGate>
      </DetailCard>

      <NotConfigurable title="Company Profile">
        <p className="mb-3">
          No company/organization model exists in the backend yet — these fields cannot be sourced
          from any API.
        </p>
        <div className="flex flex-col gap-2">
          <NotConfigurableField label="Company Name" />
          <NotConfigurableField label="Logo" />
          <NotConfigurableField label="Email" />
          <NotConfigurableField label="Phone" />
          <NotConfigurableField label="Website" />
          <NotConfigurableField label="Address" />
        </div>
      </NotConfigurable>

      {data.businessHours ? (
        <DetailCard title="Business Hours">
          {Object.entries(data.businessHours).map(([day, hours]) => (
            <FieldRow key={day} label={day}>
              {hours.start} – {hours.end}
            </FieldRow>
          ))}
        </DetailCard>
      ) : null}
    </div>
  );
}

function ReadOnlyView({ settings }: { settings: CrmSettings }) {
  return (
    <div className="flex flex-col gap-1">
      <FieldRow label="Currency">{settings.currency}</FieldRow>
      <FieldRow label="Timezone">{settings.timezone}</FieldRow>
      <FieldRow label="Default Reminder">
        {settings.defaultReminderMinutesBeforeDue ?? '—'} min before due
      </FieldRow>
    </div>
  );
}
