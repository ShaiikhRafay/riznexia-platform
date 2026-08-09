import { WebsiteStatusController } from './website-status.controller';
import type { WebsiteStatusService } from './website-status.service';

describe('WebsiteStatusController', () => {
  let websiteStatusService: { getForLead: jest.Mock };
  let controller: WebsiteStatusController;

  beforeEach(() => {
    websiteStatusService = { getForLead: jest.fn() };
    controller = new WebsiteStatusController(
      websiteStatusService as unknown as WebsiteStatusService,
    );
  });

  it('get delegates to WebsiteStatusService.getForLead with the lead id', async () => {
    websiteStatusService.getForLead.mockResolvedValue({ stage: 'not_started' });
    await expect(controller.get('lead-1')).resolves.toEqual({ stage: 'not_started' });
    expect(websiteStatusService.getForLead).toHaveBeenCalledWith('lead-1');
  });
});
