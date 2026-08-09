import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BarList } from './bar-list';

describe('BarList', () => {
  it('shows the empty message when there are no items', () => {
    render(<BarList items={[]} emptyMessage="No data yet." />);
    expect(screen.getByText('No data yet.')).toBeInTheDocument();
  });

  it('renders every item label and value', () => {
    render(
      <BarList
        items={[
          { key: 'a', label: 'Alpha', value: 10, valueLabel: '10' },
          { key: 'b', label: 'Beta', value: 5, valueLabel: '5' },
        ]}
      />,
    );
    expect(screen.getByText('Alpha')).toBeInTheDocument();
    expect(screen.getByText('Beta')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('sizes each bar proportionally to the largest value', () => {
    render(
      <BarList
        items={[
          { key: 'a', label: 'Alpha', value: 100, valueLabel: '100' },
          { key: 'b', label: 'Beta', value: 25, valueLabel: '25' },
        ]}
      />,
    );
    const bars = document.querySelectorAll('.bg-\\(--color-accent\\)');
    expect(bars[0]).toHaveStyle({ width: '100%' });
    expect(bars[1]).toHaveStyle({ width: '25%' });
  });
});
