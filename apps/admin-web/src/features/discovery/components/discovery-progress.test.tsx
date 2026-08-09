import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DiscoveryProgress } from './discovery-progress';

describe('DiscoveryProgress', () => {
  it('renders the three normal-path steps for a queued job', () => {
    render(<DiscoveryProgress status="queued" />);
    expect(screen.getByText('Queued')).toBeInTheDocument();
    expect(screen.getByText('Running')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('marks the current step for a running job', () => {
    render(<DiscoveryProgress status="running" />);
    const runningStep = screen.getByText('Running');
    expect(runningStep).toHaveAttribute('aria-current', 'step');
  });

  it('renders a dedicated failed state, not a fourth step on the linear track', () => {
    render(<DiscoveryProgress status="failed" />);
    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.getByText('This search did not complete.')).toBeInTheDocument();
    expect(screen.queryByText('Queued')).not.toBeInTheDocument();
  });
});
