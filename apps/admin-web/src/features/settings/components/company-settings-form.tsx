'use client';

import { updateCrmSettingsSchema, type CrmSettings } from '@riznexia/shared-types';
import { Button, Input, Label, toast } from '@riznexia/ui';
import { useState } from 'react';
import { ApiError } from '@/src/lib/api-client';
import { useUpdateCrmSettings } from '../api/use-update-crm-settings';

// Company Settings (F13): edits the three simple scalar fields the M10
// `CrmSettings` singleton actually exposes for update — `currency`,
// `timezone`, `defaultReminderMinutesBeforeDue`. `businessHours` is a
// free-form per-day JSON map (`Record<string, {start,end}>`); this module
// displays it read-only rather than inventing a weekly-schedule editor UI
// the founder's brief never asked for (D-196). Validated against the exact
// shared `updateCrmSettingsSchema` the backend itself enforces — not a
// second, hand-rolled copy of the same rules.
export function CompanySettingsForm({ settings }: { settings: CrmSettings }) {
  const [currency, setCurrency] = useState(settings.currency);
  const [timezone, setTimezone] = useState(settings.timezone);
  const [reminderMinutes, setReminderMinutes] = useState(
    settings.defaultReminderMinutesBeforeDue !== null
      ? String(settings.defaultReminderMinutesBeforeDue)
      : '',
  );
  const [submitting, setSubmitting] = useState(false);
  const updateSettings = useUpdateCrmSettings();

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();

    const payload = {
      currency,
      timezone,
      defaultReminderMinutesBeforeDue:
        reminderMinutes.trim() === '' ? null : Number(reminderMinutes),
    };

    const parsed = updateCrmSettingsSchema.safeParse(payload);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? 'Invalid settings.');
      return;
    }

    setSubmitting(true);
    try {
      await updateSettings.mutateAsync(parsed.data);
      toast.success('Company settings updated');
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Could not update settings.';
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="currency">Currency</Label>
        <Input
          id="currency"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          maxLength={3}
          placeholder="USD"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="timezone">Timezone</Label>
        <Input
          id="timezone"
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          placeholder="UTC"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="reminder-minutes">Default Reminder (minutes before due)</Label>
        <Input
          id="reminder-minutes"
          type="number"
          min={1}
          value={reminderMinutes}
          onChange={(e) => setReminderMinutes(e.target.value)}
          placeholder="Not set"
        />
      </div>

      <Button type="submit" loading={submitting} className="w-fit">
        Save Changes
      </Button>
    </form>
  );
}
