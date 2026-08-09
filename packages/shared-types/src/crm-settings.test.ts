import { describe, expect, it } from 'vitest';
import { crmSettingsSchema, updateCrmSettingsSchema } from './crm-settings';

const UUID_A = '11111111-1111-4111-8111-111111111111';

describe('crmSettingsSchema', () => {
  it('accepts a fully-populated settings row', () => {
    expect(
      crmSettingsSchema.safeParse({
        id: UUID_A,
        defaultStageId: UUID_A,
        currency: 'USD',
        timezone: 'UTC',
        businessHours: { mon: { start: '09:00', end: '17:00' } },
        defaultReminderMinutesBeforeDue: 60,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).success,
    ).toBe(true);
  });

  it('accepts null businessHours/defaultReminder', () => {
    expect(
      crmSettingsSchema.safeParse({
        id: UUID_A,
        defaultStageId: null,
        currency: 'USD',
        timezone: 'UTC',
        businessHours: null,
        defaultReminderMinutesBeforeDue: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }).success,
    ).toBe(true);
  });
});

describe('updateCrmSettingsSchema', () => {
  it('rejects an empty body', () => {
    expect(updateCrmSettingsSchema.safeParse({}).success).toBe(false);
  });

  it('uppercases a lowercase currency code', () => {
    const result = updateCrmSettingsSchema.safeParse({ currency: 'usd' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.currency).toBe('USD');
  });

  it('rejects an invalid currency code', () => {
    expect(updateCrmSettingsSchema.safeParse({ currency: 'US' }).success).toBe(false);
  });
});
