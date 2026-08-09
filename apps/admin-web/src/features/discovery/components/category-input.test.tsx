import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { CategoryInput } from './category-input';

describe('CategoryInput', () => {
  it('adds a category chip when Enter is pressed', async () => {
    const onChange = vi.fn();
    render(<CategoryInput value={[]} onChange={onChange} max={5} />);

    await userEvent.type(
      screen.getByRole('textbox', { name: 'Add a category' }),
      'restaurant{enter}',
    );
    expect(onChange).toHaveBeenCalledWith(['restaurant']);
  });

  it('adds a category chip on comma', async () => {
    const onChange = vi.fn();
    render(<CategoryInput value={[]} onChange={onChange} max={5} />);

    await userEvent.type(screen.getByRole('textbox', { name: 'Add a category' }), 'clinic,');
    expect(onChange).toHaveBeenCalledWith(['clinic']);
  });

  it('renders existing chips with a remove control', () => {
    render(<CategoryInput value={['restaurant', 'clinic']} onChange={vi.fn()} max={5} />);
    expect(screen.getByText('restaurant')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove clinic' })).toBeInTheDocument();
  });

  it('removes a chip when its remove button is clicked', async () => {
    const onChange = vi.fn();
    render(<CategoryInput value={['restaurant', 'clinic']} onChange={onChange} max={5} />);

    await userEvent.click(screen.getByRole('button', { name: 'Remove restaurant' }));
    expect(onChange).toHaveBeenCalledWith(['clinic']);
  });

  it('disables input and Add button at the max (5, matching createDiscoveryJobSchema)', () => {
    render(<CategoryInput value={['a', 'b', 'c', 'd', 'e']} onChange={vi.fn()} max={5} />);
    expect(screen.getByRole('textbox', { name: 'Add a category' })).toBeDisabled();
  });

  it('never adds a duplicate category', async () => {
    const onChange = vi.fn();
    render(<CategoryInput value={['restaurant']} onChange={onChange} max={5} />);

    await userEvent.type(
      screen.getByRole('textbox', { name: 'Add a category' }),
      'restaurant{enter}',
    );
    expect(onChange).not.toHaveBeenCalled();
  });

  it('never adds a blank/whitespace-only category', async () => {
    const onChange = vi.fn();
    render(<CategoryInput value={[]} onChange={onChange} max={5} />);

    await userEvent.type(screen.getByRole('textbox', { name: 'Add a category' }), '   {enter}');
    expect(onChange).not.toHaveBeenCalled();
  });
});
