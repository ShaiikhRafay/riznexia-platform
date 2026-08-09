import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusBadge } from './status-badge';

describe('StatusBadge', () => {
  it('renders the given label as visible text, never color-only', () => {
    render(<StatusBadge variant="success" label="Completed" />);
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('defaults to the neutral variant when none is given', () => {
    const { container } = render(<StatusBadge label="Queued" />);
    expect(container.firstChild).toHaveClass('text-(--color-text-secondary)');
  });

  it('applies the danger variant styling', () => {
    const { container } = render(<StatusBadge variant="danger" label="Failed" />);
    expect(container.firstChild).toHaveClass('text-(--color-danger)');
  });
});
