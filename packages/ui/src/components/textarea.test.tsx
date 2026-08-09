import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Textarea } from './textarea';

describe('Textarea', () => {
  it('renders and accepts typed text', async () => {
    render(<Textarea aria-label="Note" />);
    const textarea = screen.getByRole('textbox', { name: 'Note' });
    await userEvent.type(textarea, 'hello');
    expect(textarea).toHaveValue('hello');
  });

  it('marks itself invalid via aria-invalid, never color alone', () => {
    render(<Textarea aria-label="Note" aria-invalid />);
    expect(screen.getByRole('textbox', { name: 'Note' })).toHaveAttribute('aria-invalid', 'true');
  });
});
