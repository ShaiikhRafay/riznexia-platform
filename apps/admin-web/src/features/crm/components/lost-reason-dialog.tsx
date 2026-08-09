'use client';

import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@riznexia/ui';
import { useState } from 'react';
import { useLostReasons } from '../api/use-lost-reasons';

export interface LostReasonDialogProps {
  open: boolean;
  onCancel: () => void;
  onConfirm: (lostReasonId: string) => void;
}

// Moving a lead into a stage with `isLost: true` requires `lostReasonId`
// in the body or the backend throws `LostReasonRequiredException` — this
// dialog is the one place that requirement is surfaced, for both a
// drag-and-drop drop and the explicit stage-picker action.
export function LostReasonDialog({ open, onCancel, onConfirm }: LostReasonDialogProps) {
  const { data: lostReasons } = useLostReasons();
  const [selected, setSelected] = useState('');

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Why was this lead lost?</DialogTitle>
        </DialogHeader>
        <select
          value={selected}
          onChange={(event) => setSelected(event.target.value)}
          className="border-(--color-border-default) bg-(--color-bg-canvas) text-(--color-text-primary) focus-visible:ring-(--color-accent) h-9 w-full rounded-md border px-3 text-sm focus-visible:outline-none focus-visible:ring-2"
        >
          <option value="">Select a reason…</option>
          {(lostReasons ?? []).map((reason) => (
            <option key={reason.id} value={reason.id}>
              {reason.label}
            </option>
          ))}
        </select>
        <DialogFooter>
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button disabled={!selected} onClick={() => onConfirm(selected)}>
            Move to Lost
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
