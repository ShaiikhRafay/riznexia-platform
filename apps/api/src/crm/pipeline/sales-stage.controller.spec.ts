import { SalesStageController } from './sales-stage.controller';
import type { SalesStageService } from './sales-stage.service';

describe('SalesStageController', () => {
  let salesStageService: {
    list: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    archive: jest.Mock;
  };
  let controller: SalesStageController;

  beforeEach(() => {
    salesStageService = {
      list: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      archive: jest.fn(),
    };
    controller = new SalesStageController(salesStageService as unknown as SalesStageService);
  });

  it('list delegates to SalesStageService.list with the validated query', async () => {
    const query = { includeArchived: false } as never;
    salesStageService.list.mockResolvedValue([]);
    await controller.list(query);
    expect(salesStageService.list).toHaveBeenCalledWith(query);
  });

  it('create delegates to SalesStageService.create', async () => {
    const body = { key: 'new', name: 'New', order: 1 } as never;
    salesStageService.create.mockResolvedValue({ id: 'stage-1' });
    await expect(controller.create(body)).resolves.toEqual({ id: 'stage-1' });
    expect(salesStageService.create).toHaveBeenCalledWith(body);
  });

  it('update delegates to SalesStageService.update with the id and body', async () => {
    const body = { name: 'Renamed' } as never;
    salesStageService.update.mockResolvedValue({ id: 'stage-1', name: 'Renamed' });
    await controller.update('stage-1', body);
    expect(salesStageService.update).toHaveBeenCalledWith('stage-1', body);
  });

  it('archive delegates to SalesStageService.archive with the id', async () => {
    salesStageService.archive.mockResolvedValue({ id: 'stage-1', archivedAt: new Date() });
    await controller.archive('stage-1');
    expect(salesStageService.archive).toHaveBeenCalledWith('stage-1');
  });
});
