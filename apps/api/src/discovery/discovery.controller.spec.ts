import { DiscoveryController } from './discovery.controller';
import type { DiscoveryService } from './discovery.service';

describe('DiscoveryController', () => {
  let discoveryService: { createJobs: jest.Mock; findMany: jest.Mock; findById: jest.Mock };
  let controller: DiscoveryController;
  const user = { id: 'rep-1', clerkUserId: 'user_1', role: 'sales_rep' as const };

  beforeEach(() => {
    discoveryService = { createJobs: jest.fn(), findMany: jest.fn(), findById: jest.fn() };
    controller = new DiscoveryController(discoveryService as unknown as DiscoveryService);
  });

  it('passes the current user id as createdById when creating jobs', async () => {
    discoveryService.createJobs.mockResolvedValue([]);
    const body = { city: 'Karachi', categories: ['restaurant'], radiusKm: 15 };

    await controller.create(body, user);

    expect(discoveryService.createJobs).toHaveBeenCalledWith(body, 'rep-1');
  });

  it('delegates list to DiscoveryService.findMany', async () => {
    discoveryService.findMany.mockResolvedValue([{ id: 'job-1' }]);
    await expect(controller.list()).resolves.toEqual([{ id: 'job-1' }]);
  });

  it('delegates getById to DiscoveryService.findById', async () => {
    discoveryService.findById.mockResolvedValue({ id: 'job-1' });
    await expect(controller.getById('job-1')).resolves.toEqual({ id: 'job-1' });
    expect(discoveryService.findById).toHaveBeenCalledWith('job-1');
  });
});
