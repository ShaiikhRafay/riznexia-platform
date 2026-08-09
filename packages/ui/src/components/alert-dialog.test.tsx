import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './alert-dialog';

function ConfirmDialog({ onConfirm }: { onConfirm: () => void }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger>Delete</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete this widget?</AlertDialogTitle>
          <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={onConfirm}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

describe('AlertDialog', () => {
  it('is closed until the trigger is clicked', () => {
    render(<ConfirmDialog onConfirm={vi.fn()} />);
    expect(screen.queryByText('This cannot be undone.')).not.toBeInTheDocument();
  });

  it('opens on trigger click and calls the confirm handler, never before it is clicked', async () => {
    const onConfirm = vi.fn();
    render(<ConfirmDialog onConfirm={onConfirm} />);

    await userEvent.click(screen.getByText('Delete'));
    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument();
    expect(onConfirm).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('closes without calling confirm when Cancel is clicked', async () => {
    const onConfirm = vi.fn();
    render(<ConfirmDialog onConfirm={onConfirm} />);

    await userEvent.click(screen.getByText('Delete'));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onConfirm).not.toHaveBeenCalled();
    expect(screen.queryByText('This cannot be undone.')).not.toBeInTheDocument();
  });
});
