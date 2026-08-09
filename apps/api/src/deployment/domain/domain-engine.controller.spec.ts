import { DomainEngineController } from './domain-engine.controller';
import type { DomainEngineService } from './domain-engine.service';

describe('DomainEngineController', () => {
  let domainEngineService: {
    listForLead: jest.Mock;
    findByIdOrThrow: jest.Mock;
    create: jest.Mock;
    verify: jest.Mock;
  };
  let controller: DomainEngineController;

  beforeEach(() => {
    domainEngineService = {
      listForLead: jest.fn(),
      findByIdOrThrow: jest.fn(),
      create: jest.fn(),
      verify: jest.fn(),
    };
    controller = new DomainEngineController(domainEngineService as unknown as DomainEngineService);
  });

  it('list delegates to DomainEngineService.listForLead with the lead id', async () => {
    domainEngineService.listForLead.mockResolvedValue([]);
    await controller.list('lead-1');
    expect(domainEngineService.listForLead).toHaveBeenCalledWith('lead-1');
  });

  it('getById delegates to DomainEngineService.findByIdOrThrow with the lead id and domain id', async () => {
    domainEngineService.findByIdOrThrow.mockResolvedValue({ id: 'domain-1' });
    await expect(controller.getById('lead-1', 'domain-1')).resolves.toEqual({ id: 'domain-1' });
    expect(domainEngineService.findByIdOrThrow).toHaveBeenCalledWith('lead-1', 'domain-1');
  });

  it('create delegates to DomainEngineService.create with the lead id and body', async () => {
    const body = { hostname: 'example.com', type: 'custom' } as never;
    domainEngineService.create.mockResolvedValue({ id: 'domain-1' });
    await controller.create('lead-1', body);
    expect(domainEngineService.create).toHaveBeenCalledWith('lead-1', body);
  });

  it('verify delegates to DomainEngineService.verify with the lead id and domain id', async () => {
    domainEngineService.verify.mockResolvedValue({ id: 'domain-1' });
    await controller.verify('lead-1', 'domain-1');
    expect(domainEngineService.verify).toHaveBeenCalledWith('lead-1', 'domain-1');
  });
});
