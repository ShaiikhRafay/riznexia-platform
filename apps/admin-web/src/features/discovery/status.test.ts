import { DISCOVERY_JOB_STATUSES } from '@riznexia/shared-types';
import { describe, expect, it } from 'vitest';
import {
  DISCOVERY_STATUS_OPTIONS,
  DISCOVERY_STATUS_PRESENTATION,
  isTerminalDiscoveryStatus,
} from './status';

describe('DISCOVERY_STATUS_PRESENTATION', () => {
  it('maps every backend-defined status to a badge presentation, no more, no fewer', () => {
    expect(Object.keys(DISCOVERY_STATUS_PRESENTATION).sort()).toEqual(
      [...DISCOVERY_JOB_STATUSES].sort(),
    );
  });

  it('mirrors every status into DISCOVERY_STATUS_OPTIONS for the history table filter', () => {
    expect(DISCOVERY_STATUS_OPTIONS).toHaveLength(DISCOVERY_JOB_STATUSES.length);
    for (const status of DISCOVERY_JOB_STATUSES) {
      expect(DISCOVERY_STATUS_OPTIONS.find((option) => option.value === status)).toBeDefined();
    }
  });
});

describe('isTerminalDiscoveryStatus', () => {
  it('treats completed and failed as terminal', () => {
    expect(isTerminalDiscoveryStatus('completed')).toBe(true);
    expect(isTerminalDiscoveryStatus('failed')).toBe(true);
  });

  it('treats queued and running as non-terminal', () => {
    expect(isTerminalDiscoveryStatus('queued')).toBe(false);
    expect(isTerminalDiscoveryStatus('running')).toBe(false);
  });
});
