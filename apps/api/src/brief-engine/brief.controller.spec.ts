import type { Response } from 'express';
import { BriefController } from './brief.controller';
import type { BriefService } from './brief.service';

const BRIEF = {
  markdown: "# BRIEF — Joe's Diner",
  slug: 'joes-diner-karachi',
  filePath: 'briefs/joes-diner-karachi/BRIEF.md',
  dataGaps: [],
};

describe('BriefController', () => {
  let briefService: { generateForLead: jest.Mock };
  let controller: BriefController;

  beforeEach(() => {
    briefService = { generateForLead: jest.fn().mockResolvedValue(BRIEF) };
    controller = new BriefController(briefService as unknown as BriefService);
  });

  it('getBrief delegates to BriefService.generateForLead', async () => {
    await expect(controller.getBrief('lead-1')).resolves.toEqual(BRIEF);
    expect(briefService.generateForLead).toHaveBeenCalledWith('lead-1');
  });

  it('download returns the markdown with attachment headers', async () => {
    const setHeader = jest.fn();
    const res = { setHeader } as unknown as Response;

    await expect(controller.download('lead-1', res)).resolves.toBe(BRIEF.markdown);

    expect(setHeader).toHaveBeenCalledWith('Content-Type', 'text/markdown; charset=utf-8');
    expect(setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'attachment; filename="BRIEF-joes-diner-karachi.md"',
    );
  });
});
