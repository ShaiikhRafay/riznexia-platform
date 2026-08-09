import { PLACE_SYNC_JOB_STATUSES } from '@riznexia/shared-types';
import { describe, expect, it } from 'vitest';
import {
  isTerminalPlaceSyncStatus,
  PLACE_SYNC_STATUS_OPTIONS,
  PLACE_SYNC_STATUS_PRESENTATION,
} from './status';

describe('PLACE_SYNC_STATUS_PRESENTATION', () => {
  it('maps every backend-defined status to a badge presentation, no more, no fewer', () => {
    expect(Object.keys(PLACE_SYNC_STATUS_PRESENTATION).sort()).toEqual(
      [...PLACE_SYNC_JOB_STATUSES].sort(),
    );
  });

  it('mirrors every status into PLACE_SYNC_STATUS_OPTIONS for the history table filter', () => {
    expect(PLACE_SYNC_STATUS_OPTIONS).toHaveLength(PLACE_SYNC_JOB_STATUSES.length);
    for (const status of PLACE_SYNC_JOB_STATUSES) {
      expect(PLACE_SYNC_STATUS_OPTIONS.find((option) => option.value === status)).toBeDefined();
    }
  });
});

describe('isTerminalPlaceSyncStatus', () => {
  it('treats completed, failed, and partial as terminal — three real terminal outcomes, not two', () => {
    expect(isTerminalPlaceSyncStatus('completed')).toBe(true);
    expect(isTerminalPlaceSyncStatus('failed')).toBe(true);
    expect(isTerminalPlaceSyncStatus('partial')).toBe(true);
  });

  it('treats queued and running as non-terminal', () => {
    expect(isTerminalPlaceSyncStatus('queued')).toBe(false);
    expect(isTerminalPlaceSyncStatus('running')).toBe(false);
  });
});
