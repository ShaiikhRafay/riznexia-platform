import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PlaceSyncProgress } from './place-sync-progress';

describe('PlaceSyncProgress', () => {
  it('renders the three normal-path steps for a queued job', () => {
    render(<PlaceSyncProgress status="queued" />);
    expect(screen.getByText('Queued')).toBeInTheDocument();
    expect(screen.getByText('Running')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('marks the current step for a running job', () => {
    render(<PlaceSyncProgress status="running" />);
    expect(screen.getByText('Running')).toHaveAttribute('aria-current', 'step');
  });

  it('renders a dedicated failed state, not a fourth step on the linear track', () => {
    render(<PlaceSyncProgress status="failed" />);
    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.getByText('This synchronization did not complete.')).toBeInTheDocument();
    expect(screen.queryByText('Queued')).not.toBeInTheDocument();
  });

  it('renders a dedicated partial state, distinct from failed', () => {
    render(<PlaceSyncProgress status="partial" />);
    expect(screen.getByText('Partial')).toBeInTheDocument();
    expect(screen.getByText('Finished, but some businesses failed to sync.')).toBeInTheDocument();
    expect(screen.queryByText('Failed')).not.toBeInTheDocument();
  });
});
