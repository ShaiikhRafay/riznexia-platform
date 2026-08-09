import type { CrmSettings as CrmSettingsModel } from '@riznexia/db';
import type { BusinessHours, CrmSettings } from '@riznexia/shared-types';

export function toCrmSettingsResponse(settings: CrmSettingsModel): CrmSettings {
  return {
    id: settings.id,
    defaultStageId: settings.defaultStageId,
    currency: settings.currency,
    timezone: settings.timezone,
    businessHours: (settings.businessHours as unknown as BusinessHours | null) ?? null,
    defaultReminderMinutesBeforeDue: settings.defaultReminderMinutesBeforeDue,
    createdAt: settings.createdAt.toISOString(),
    updatedAt: settings.updatedAt.toISOString(),
  };
}
