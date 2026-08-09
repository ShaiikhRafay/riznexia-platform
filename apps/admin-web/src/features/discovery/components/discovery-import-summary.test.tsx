import { render, screen } from '@testing-library/react';
import type { DiscoveryJob } from '@riznexia/shared-types';
import { describe, expect, it } from 'vitest';
import { DiscoveryImportSummary } from './discovery-import-summary';

const BASE_JOB: DiscoveryJob = {
  id: '1',
  city: 'Karachi',
  category: 'restaurant',
  status: 'completed',
  resultsCount: 7,
};

describe('DiscoveryImportSummary', () => {
  it('shows resultsCount for a completed job — the only field the backend returns for this', () => {
    render(<DiscoveryImportSummary job={BASE_JOB} />);
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText(/businesses discovered in Karachi/)).toBeInTheDocument();
  });

  it('renders nothing for a non-completed job', () => {
    const { container } = render(
      <DiscoveryImportSummary job={{ ...BASE_JOB, status: 'running' }} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('uses singular "business" for a count of exactly 1', () => {
    render(<DiscoveryImportSummary job={{ ...BASE_JOB, resultsCount: 1 }} />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText(/^business discovered/)).toBeInTheDocument();
  });
});
