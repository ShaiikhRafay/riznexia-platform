import { REPORT_TYPES } from '@riznexia/shared-types';
import { describe, expect, it } from 'vitest';
import { REPORT_TYPE_LABELS, REPORT_TYPE_OPTIONS } from './report-labels';

describe('REPORT_TYPE_LABELS', () => {
  it('has exactly one label per real backend REPORT_TYPES value, no more, no fewer', () => {
    expect(Object.keys(REPORT_TYPE_LABELS).sort()).toEqual([...REPORT_TYPES].sort());
  });

  it('never includes a report the backend does not implement (Business Growth, API Usage, Preview)', () => {
    const labels = Object.values(REPORT_TYPE_LABELS);
    expect(labels).not.toContain('Business Growth');
    expect(labels).not.toContain('API Usage Report');
    expect(labels).not.toContain('Preview Report');
  });
});

describe('REPORT_TYPE_OPTIONS', () => {
  it('has exactly fifteen options, one per real report type', () => {
    expect(REPORT_TYPE_OPTIONS).toHaveLength(15);
  });

  it('every option value is a real backend report type', () => {
    for (const option of REPORT_TYPE_OPTIONS) {
      expect(REPORT_TYPES).toContain(option.value);
    }
  });
});
