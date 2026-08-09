import { describe, expect, it } from 'vitest';
import { exportQuerySchema } from './analytics-export';

describe('exportQuerySchema', () => {
  it('accepts a csv export request', () => {
    expect(exportQuerySchema.safeParse({ format: 'csv' }).success).toBe(true);
  });

  it('accepts pdf/excel at the schema layer — rejection happens at the service layer, not validation', () => {
    expect(exportQuerySchema.safeParse({ format: 'pdf' }).success).toBe(true);
    expect(exportQuerySchema.safeParse({ format: 'excel' }).success).toBe(true);
  });

  it('rejects a missing format', () => {
    expect(exportQuerySchema.safeParse({}).success).toBe(false);
  });

  it('rejects an unknown format', () => {
    expect(exportQuerySchema.safeParse({ format: 'json' }).success).toBe(false);
  });
});
