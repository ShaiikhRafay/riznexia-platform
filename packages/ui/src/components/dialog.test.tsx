import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './dialog';

function FormDialog({ onSubmit }: { onSubmit: () => void }) {
  return (
    <Dialog>
      <DialogTrigger>New Task</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Task</DialogTitle>
          <DialogDescription>Add a follow-up task for this lead.</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose>Cancel</DialogClose>
          <button type="button" onClick={onSubmit}>
            Save
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

describe('Dialog', () => {
  it('is closed until the trigger is clicked', () => {
    render(<FormDialog onSubmit={vi.fn()} />);
    expect(screen.queryByText('Add a follow-up task for this lead.')).not.toBeInTheDocument();
  });

  it('opens on trigger click and shows its content', async () => {
    render(<FormDialog onSubmit={vi.fn()} />);
    await userEvent.click(screen.getByText('New Task'));
    expect(screen.getByText('Create Task')).toBeInTheDocument();
    expect(screen.getByText('Add a follow-up task for this lead.')).toBeInTheDocument();
  });

  it('closes when DialogClose is clicked, without calling the submit handler', async () => {
    const onSubmit = vi.fn();
    render(<FormDialog onSubmit={onSubmit} />);
    await userEvent.click(screen.getByText('New Task'));
    await userEvent.click(screen.getByText('Cancel'));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.queryByText('Create Task')).not.toBeInTheDocument();
  });
});
