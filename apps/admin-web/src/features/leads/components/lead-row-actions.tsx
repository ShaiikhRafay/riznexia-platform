'use client';

import type { Lead } from '@riznexia/shared-types';
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
  Button,
  toast,
} from '@riznexia/ui';
import { Eye, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { PermissionGate } from '@/src/components/auth/permission-gate';
import { ApiError } from '@/src/lib/api-client';
import { useDeleteLead } from '../api/use-delete-lead';

export interface LeadRowActionsProps {
  lead: Lead;
}

// Row-level actions (F4): View always shown (leads:read is universal);
// Edit gated on leads:write, Delete gated on leads:delete — hidden, not
// disabled, when the permission is missing (docs/17 §7).
export function LeadRowActions({ lead }: LeadRowActionsProps) {
  const deleteLead = useDeleteLead();

  async function handleDelete() {
    try {
      await deleteLead.mutateAsync(lead.id);
      toast.success(`${lead.businessName} deleted`);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Could not delete this lead.';
      toast.error(message);
    }
  }

  return (
    <div className="flex items-center gap-1">
      <Button variant="ghost" size="icon" asChild aria-label={`View ${lead.businessName}`}>
        <Link href={`/leads/${lead.id}`}>
          <Eye className="h-4 w-4" aria-hidden="true" />
        </Link>
      </Button>
      <PermissionGate permission="leads:write">
        <Button variant="ghost" size="icon" asChild aria-label={`Edit ${lead.businessName}`}>
          <Link href={`/leads/${lead.id}/edit`}>
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </PermissionGate>
      <PermissionGate permission="leads:delete">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={`Delete ${lead.businessName}`}>
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {lead.businessName}?</AlertDialogTitle>
              <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={() => void handleDelete()}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </PermissionGate>
    </div>
  );
}
