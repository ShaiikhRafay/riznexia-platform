import { ANALYSIS_STATUSES } from '@riznexia/shared-types';
import { describe, expect, it } from 'vitest';
import {
  ANALYSIS_STATUS_OPTIONS,
  ANALYSIS_STATUS_PRESENTATION,
  isTerminalAnalysisStatus,
} from './status';

describe('ANALYSIS_STATUS_PRESENTATION', () => {
  it('maps every backend-defined status to a badge presentation, no more, no fewer', () => {
    expect(Object.keys(ANALYSIS_STATUS_PRESENTATION).sort()).toEqual([...ANALYSIS_STATUSES].sort());
  });

  it('mirrors every status into ANALYSIS_STATUS_OPTIONS', () => {
    expect(ANALYSIS_STATUS_OPTIONS).toHaveLength(ANALYSIS_STATUSES.length);
    for (const status of ANALYSIS_STATUSES) {
      expect(ANALYSIS_STATUS_OPTIONS.find((option) => option.value === status)).toBeDefined();
    }
  });
});

describe('isTerminalAnalysisStatus', () => {
  it('treats completed and failed as terminal', () => {
    expect(isTerminalAnalysisStatus('completed')).toBe(true);
    expect(isTerminalAnalysisStatus('failed')).toBe(true);
  });

  it('treats pending as non-terminal — the only non-terminal status this module has', () => {
    expect(isTerminalAnalysisStatus('pending')).toBe(false);
  });
});
