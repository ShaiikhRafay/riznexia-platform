import { describe, expect, it } from 'vitest';
import { parseHealthCheckDetail } from './health-check-detail';

describe('parseHealthCheckDetail', () => {
  it('parses the real backend shape: { checks: [{ name, passed, detail }] }', () => {
    const detail = {
      checks: [
        { name: 'deployment_status', passed: true, detail: { status: 'COMPLETED' } },
        { name: 'website_reachable', passed: false, detail: { httpStatusCode: 500 } },
      ],
    };
    expect(parseHealthCheckDetail(detail)).toEqual([
      { name: 'deployment_status', passed: true },
      { name: 'website_reachable', passed: false },
    ]);
  });

  it('returns an empty list for null detail', () => {
    expect(parseHealthCheckDetail(null)).toEqual([]);
  });

  it('returns an empty list when checks is missing entirely', () => {
    expect(parseHealthCheckDetail({ somethingElse: true })).toEqual([]);
  });

  it('skips malformed entries instead of throwing', () => {
    const detail = {
      checks: [
        { name: 'deployment_status', passed: true },
        { name: 'missing_passed' },
        { passed: true },
        'not-an-object',
        null,
      ],
    };
    expect(parseHealthCheckDetail(detail)).toEqual([{ name: 'deployment_status', passed: true }]);
  });
});
