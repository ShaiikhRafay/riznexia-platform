import type { PrismaClient } from '@riznexia/db';
import { CrmSettingsService } from './crm-settings.service';

function fakeSettingsRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'settings-1',
    defaultStageId: 'stage-1',
    currency: 'USD',
    timezone: 'UTC',
    businessHours: null,
    defaultReminderMinutesBeforeDue: 60,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('CrmSettingsService', () => {
  let prisma: { crmSettings: { findFirst: jest.Mock; update: jest.Mock } };
  let service: CrmSettingsService;

  beforeEach(() => {
    prisma = { crmSettings: { findFirst: jest.fn(), update: jest.fn() } };
    service = new CrmSettingsService(prisma as unknown as PrismaClient);
  });

  describe('get', () => {
    it('returns the singleton row', async () => {
      prisma.crmSettings.findFirst.mockResolvedValue(fakeSettingsRow());
      const result = await service.get();
      expect(result.currency).toBe('USD');
    });

    it('throws an internal Error (not a domain exception) when no row exists — a migration invariant, not a legitimate outcome', async () => {
      prisma.crmSettings.findFirst.mockResolvedValue(null);
      await expect(service.get()).rejects.toThrow(/CrmSettings row exists/);
    });
  });

  describe('update', () => {
    it('updates only the provided fields, uppercasing currency at the schema layer (not this service)', async () => {
      prisma.crmSettings.findFirst.mockResolvedValue(fakeSettingsRow());
      prisma.crmSettings.update.mockResolvedValue(fakeSettingsRow({ currency: 'EUR' }));
      const result = await service.update({ currency: 'EUR' });
      expect(prisma.crmSettings.update).toHaveBeenCalledWith({
        where: { id: 'settings-1' },
        data: { currency: 'EUR' },
      });
      expect(result.currency).toBe('EUR');
    });
  });
});
