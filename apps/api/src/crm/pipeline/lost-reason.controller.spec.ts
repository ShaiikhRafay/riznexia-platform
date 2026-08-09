import { LostReasonController } from './lost-reason.controller';
import type { LostReasonService } from './lost-reason.service';

describe('LostReasonController', () => {
  let lostReasonService: {
    list: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    archive: jest.Mock;
  };
  let controller: LostReasonController;

  beforeEach(() => {
    lostReasonService = {
      list: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      archive: jest.fn(),
    };
    controller = new LostReasonController(lostReasonService as unknown as LostReasonService);
  });

  it('list delegates to LostReasonService.list with the validated query', async () => {
    const query = { includeArchived: true } as never;
    lostReasonService.list.mockResolvedValue([]);
    await controller.list(query);
    expect(lostReasonService.list).toHaveBeenCalledWith(query);
  });

  it('create delegates to LostReasonService.create', async () => {
    const body = { key: 'price_too_high', label: 'Price too high', order: 1 } as never;
    lostReasonService.create.mockResolvedValue({ id: 'reason-1' });
    await expect(controller.create(body)).resolves.toEqual({ id: 'reason-1' });
    expect(lostReasonService.create).toHaveBeenCalledWith(body);
  });

  it('update delegates to LostReasonService.update with the id and body', async () => {
    const body = { label: 'Renamed' } as never;
    lostReasonService.update.mockResolvedValue({ id: 'reason-1', label: 'Renamed' });
    await controller.update('reason-1', body);
    expect(lostReasonService.update).toHaveBeenCalledWith('reason-1', body);
  });

  it('archive delegates to LostReasonService.archive with the id', async () => {
    lostReasonService.archive.mockResolvedValue({ id: 'reason-1', archivedAt: new Date() });
    await controller.archive('reason-1');
    expect(lostReasonService.archive).toHaveBeenCalledWith('reason-1');
  });
});
