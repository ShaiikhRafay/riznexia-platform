import { PIPELINE_STAGES } from '@riznexia/shared-types';
import { describe, expect, it } from 'vitest';
import { LEAD_STAGE_OPTIONS, LEAD_STAGE_PRESENTATION } from './lead-stage';

describe('LEAD_STAGE_PRESENTATION', () => {
  it('maps every backend-defined pipeline stage to a badge presentation, no more, no fewer', () => {
    expect(Object.keys(LEAD_STAGE_PRESENTATION).sort()).toEqual([...PIPELINE_STAGES].sort());
  });

  it('mirrors every stage into LEAD_STAGE_OPTIONS for the stage filter/select', () => {
    expect(LEAD_STAGE_OPTIONS).toHaveLength(PIPELINE_STAGES.length);
    for (const stage of PIPELINE_STAGES) {
      expect(LEAD_STAGE_OPTIONS.find((option) => option.value === stage)).toBeDefined();
    }
  });
});
