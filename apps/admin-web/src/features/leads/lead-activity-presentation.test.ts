import { LEAD_ACTIVITY_TYPES } from '@riznexia/shared-types';
import { describe, expect, it } from 'vitest';
import {
  describeActivityDetail,
  isLeadActivityType,
  LEAD_ACTIVITY_LABELS,
} from './lead-activity-presentation';

describe('LEAD_ACTIVITY_LABELS', () => {
  it('maps every backend-defined activity type to a label, no more, no fewer', () => {
    expect(Object.keys(LEAD_ACTIVITY_LABELS).sort()).toEqual([...LEAD_ACTIVITY_TYPES].sort());
  });
});

describe('isLeadActivityType', () => {
  it('accepts every real activity type', () => {
    for (const type of LEAD_ACTIVITY_TYPES) {
      expect(isLeadActivityType(type)).toBe(true);
    }
  });

  it('rejects an unknown string', () => {
    expect(isLeadActivityType('not_a_real_type')).toBe(false);
  });
});

describe('describeActivityDetail', () => {
  it('renders a from/to pair when both are strings', () => {
    expect(describeActivityDetail({ from: 'new', to: 'qualified' })).toBe('new → qualified');
  });

  it('returns null for a null detail', () => {
    expect(describeActivityDetail(null)).toBeNull();
  });

  it('returns null when from/to are missing or not strings', () => {
    expect(describeActivityDetail({})).toBeNull();
    expect(describeActivityDetail({ from: 1, to: 2 })).toBeNull();
  });
});
