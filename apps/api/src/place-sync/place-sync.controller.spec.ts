import { PlaceSyncController } from './place-sync.controller';
import type { PlaceSyncService } from './place-sync.service';

describe('PlaceSyncController', () => {
  let placeSyncService: { createJob: jest.Mock; findMany: jest.Mock; findById: jest.Mock };
  let controller: PlaceSyncController;
  const user = { id: 'rep-1', clerkUserId: 'user_1', role: 'sales_executive' as const };

  beforeEach(() => {
    placeSyncService = { createJob: jest.fn(), findMany: jest.fn(), findById: jest.fn() };
    controller = new PlaceSyncController(placeSyncService as unknown as PlaceSyncService);
  });

  it('passes the current user id as createdById when creating a job', async () => {
    placeSyncService.createJob.mockResolvedValue({ id: 'job-1' });
    const body = { city: 'Karachi', category: 'restaurant', radiusMeters: 15000 };

    await controller.create(body, user);

    expect(placeSyncService.createJob).toHaveBeenCalledWith(body, 'rep-1');
  });

  it('delegates list to PlaceSyncService.findMany', async () => {
    placeSyncService.findMany.mockResolvedValue([{ id: 'job-1' }]);
    await expect(controller.list()).resolves.toEqual([{ id: 'job-1' }]);
  });

  it('delegates getById to PlaceSyncService.findById', async () => {
    placeSyncService.findById.mockResolvedValue({ id: 'job-1' });
    await expect(controller.getById('job-1')).resolves.toEqual({ id: 'job-1' });
    expect(placeSyncService.findById).toHaveBeenCalledWith('job-1');
  });
});
