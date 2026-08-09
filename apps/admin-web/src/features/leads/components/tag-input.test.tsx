import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TagInput } from './tag-input';

describe('TagInput', () => {
  it('adds a normalized (trimmed, lowercased) tag chip when Enter is pressed', async () => {
    const onChange = vi.fn();
    render(<TagInput value={[]} onChange={onChange} />);

    await userEvent.type(screen.getByLabelText('Add a tag'), '  VIP{Enter}');
    expect(onChange).toHaveBeenCalledWith(['vip']);
  });

  it('rejects a tag with disallowed characters and shows the backend-matching error', async () => {
    const onChange = vi.fn();
    render(<TagInput value={[]} onChange={onChange} />);

    await userEvent.type(screen.getByLabelText('Add a tag'), '#invalid{Enter}');
    expect(onChange).not.toHaveBeenCalled();
    expect(
      screen.getByText(/letters, numbers, spaces, hyphens and underscores/),
    ).toBeInTheDocument();
  });

  it('does not add a duplicate of an already-present tag', async () => {
    const onChange = vi.fn();
    render(<TagInput value={['vip']} onChange={onChange} />);

    await userEvent.type(screen.getByLabelText('Add a tag'), 'vip{Enter}');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('removes a tag when its remove button is clicked', async () => {
    const onChange = vi.fn();
    render(<TagInput value={['vip', 'urgent']} onChange={onChange} />);

    await userEvent.click(screen.getByLabelText('Remove vip'));
    expect(onChange).toHaveBeenCalledWith(['urgent']);
  });

  it('disables the input once MAX_TAGS_PER_LEAD is reached', () => {
    const twentyTags = Array.from({ length: 20 }, (_, i) => `tag${i}`);
    render(<TagInput value={twentyTags} onChange={vi.fn()} />);

    expect(screen.getByLabelText('Add a tag')).toBeDisabled();
  });
});
