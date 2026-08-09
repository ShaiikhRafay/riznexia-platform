import { toCsv } from './csv-formatter';

describe('toCsv', () => {
  it('formats an array of objects directly as rows', () => {
    const csv = toCsv([
      { label: 'restaurant', count: 10 },
      { label: 'gym', count: 5 },
    ]);
    expect(csv).toBe('label,count\nrestaurant,10\ngym,5');
  });

  it('formats an object with exactly one array-of-objects field using that field as rows', () => {
    const csv = toCsv({
      totalLeads: 15,
      stages: [{ stageKey: 'new', stageName: 'New', count: 15 }],
    });
    expect(csv).toBe('stageKey,stageName,count\nnew,New,15');
  });

  it('formats a plain scalar-only object as a single row', () => {
    const csv = toCsv({ totalCostUsd: 12.5, currentMonthSpendUsd: 12.5 });
    expect(csv).toBe('totalCostUsd,currentMonthSpendUsd\n12.5,12.5');
  });

  it('escapes a cell containing a comma by quoting it', () => {
    const csv = toCsv([{ label: 'Coffee, Tea & Co', count: 1 }]);
    expect(csv).toBe('label,count\n"Coffee, Tea & Co",1');
  });

  it('escapes a cell containing a double quote by doubling it', () => {
    const csv = toCsv([{ label: 'The "Best" Diner', count: 1 }]);
    expect(csv).toBe('label,count\n"The ""Best"" Diner",1');
  });

  it('renders null/undefined cells as empty strings', () => {
    const csv = toCsv([{ label: 'x', note: null }]);
    expect(csv).toBe('label,note\nx,');
  });

  it('returns an empty string for an empty array', () => {
    expect(toCsv([])).toBe('');
  });
});
