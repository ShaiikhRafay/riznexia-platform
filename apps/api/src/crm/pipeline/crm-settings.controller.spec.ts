import { CrmSettingsController } from './crm-settings.controller';
import type { CrmSettingsService } from './crm-settings.service';

describe('CrmSettingsController', () => {
  let crmSettingsService: { get: jest.Mock; update: jest.Mock };
  let controller: CrmSettingsController;

  beforeEach(() => {
    crmSettingsService = { get: jest.fn(), update: jest.fn() };
    controller = new CrmSettingsController(crmSettingsService as unknown as CrmSettingsService);
  });

  it('get delegates to CrmSettingsService.get', async () => {
    crmSettingsService.get.mockResolvedValue({ id: 'settings-1', currency: 'USD' });
    await expect(controller.get()).resolves.toEqual({ id: 'settings-1', currency: 'USD' });
    expect(crmSettingsService.get).toHaveBeenCalledWith();
  });

  it('update delegates to CrmSettingsService.update with the body', async () => {
    const body = { currency: 'EUR' } as never;
    crmSettingsService.update.mockResolvedValue({ id: 'settings-1', currency: 'EUR' });
    await controller.update(body);
    expect(crmSettingsService.update).toHaveBeenCalledWith(body);
  });
});
