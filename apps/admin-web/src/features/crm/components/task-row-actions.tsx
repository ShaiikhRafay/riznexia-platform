'use client';

import type { CrmTask } from '@riznexia/shared-types';
import { Button, toast } from '@riznexia/ui';
import { Check, X } from 'lucide-react';
import { PermissionGate } from '@/src/components/auth/permission-gate';
import { ApiError } from '@/src/lib/api-client';
import { useUpdateTask } from '../api/use-update-task';
import { EditTaskDialog } from './edit-task-dialog';

export interface TaskRowActionsProps {
  task: CrmTask;
  leadId?: string;
}

// Tasks — Complete / Cancel (F10): both are `PATCH /crm/tasks/:id` with
// just `{status}` — there is no dedicated action route on the backend.
// Hidden once a task has already reached that terminal status, rather
// than shown-then-disabled.
export function TaskRowActions({ task, leadId }: TaskRowActionsProps) {
  const updateTask = useUpdateTask(task.id, leadId);

  async function setStatus(status: 'completed' | 'cancelled') {
    try {
      await updateTask.mutateAsync({ status });
      toast.success(status === 'completed' ? 'Task completed' : 'Task cancelled');
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Could not update the task.';
      toast.error(message);
    }
  }

  return (
    <div className="flex items-center gap-1">
      <PermissionGate permission="crm:manage">
        <EditTaskDialog task={task} leadId={leadId} />
        {task.status !== 'completed' ? (
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Complete ${task.title}`}
            onClick={() => void setStatus('completed')}
          >
            <Check className="h-4 w-4" aria-hidden="true" />
          </Button>
        ) : null}
        {task.status !== 'cancelled' && task.status !== 'completed' ? (
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Cancel ${task.title}`}
            onClick={() => void setStatus('cancelled')}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        ) : null}
      </PermissionGate>
    </div>
  );
}
