import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ErrorState } from './error-state';

describe('ErrorState', () => {
  it('renders a known code with its dedicated title and the backend message, never a swallowed blank state', () => {
    render(
      <ErrorState error={{ code: 'FORBIDDEN', message: 'You do not have crm:report access' }} />,
    );

    expect(screen.getByText("You don't have access to this")).toBeInTheDocument();
    expect(screen.getByText('You do not have crm:report access')).toBeInTheDocument();
  });

  it('renders an unmapped module-specific code with a generic title, never hiding the backend message', () => {
    render(
      <ErrorState
        error={{
          code: 'EXPORT_FORMAT_NOT_IMPLEMENTED',
          message: 'Export format "pdf" is reserved',
        }}
      />,
    );

    expect(screen.getByText('Export format "pdf" is reserved')).toBeInTheDocument();
  });

  it('renders even with no code at all (a raw network/thrown error)', () => {
    render(<ErrorState error={{ message: 'Could not reach the server.' }} />);
    expect(screen.getByText('Could not reach the server.')).toBeInTheDocument();
  });

  it('calls onRetry when the retry button is clicked, and omits it when no handler is given', async () => {
    const onRetry = vi.fn();
    const { rerender } = render(<ErrorState error={{ message: 'failed' }} onRetry={onRetry} />);

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(onRetry).toHaveBeenCalledTimes(1);

    rerender(<ErrorState error={{ message: 'failed' }} />);
    expect(screen.queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
  });
});
