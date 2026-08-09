import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { RefreshIntervalProvider } from '../refresh-interval';
import { RefreshIntervalSelect } from './refresh-interval-select';

function renderControl() {
  return render(
    <RefreshIntervalProvider>
      <RefreshIntervalSelect />
    </RefreshIntervalProvider>,
  );
}

describe('RefreshIntervalSelect', () => {
  it('defaults to Manual', () => {
    renderControl();
    expect(screen.getByRole('button', { name: /manual/i })).toBeInTheDocument();
  });

  it('offers exactly the four founder-specified options', async () => {
    renderControl();
    await userEvent.click(screen.getByRole('button', { name: /manual/i }));
    for (const label of ['Manual', '30 seconds', '1 minute', '5 minutes']) {
      expect(screen.getByRole('menuitemradio', { name: label })).toBeInTheDocument();
    }
  });

  it('updates the displayed label after selecting an interval', async () => {
    renderControl();
    await userEvent.click(screen.getByRole('button', { name: /manual/i }));
    await userEvent.click(screen.getByRole('menuitemradio', { name: '5 minutes' }));
    expect(screen.getByRole('button', { name: /5 minutes/i })).toBeInTheDocument();
  });
});
