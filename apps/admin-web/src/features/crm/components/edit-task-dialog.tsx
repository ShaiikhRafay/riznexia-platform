'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  TASK_TITLE_MAX_LENGTH,
  TASK_DESCRIPTION_MAX_LENGTH,
  type CrmTask,
} from '@riznexia/shared-types';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Textarea,
  toast,
} from '@riznexia/ui';
import { Pencil } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ApiError } from '@/src/lib/api-client';
import { useUpdateTask } from '../api/use-update-task';
import { TASK_PRIORITY_OPTIONS } from '../status';

// Tasks — Edit (F10): `PATCH /crm/tasks/:id`, the same endpoint Complete
// and Cancel use — this dialog only ever sends the fields a person can
// edit here (title/description/dueDate/priority/assignedToId), never
// `status` (that's `TaskRowActions`' own one-click Complete/Cancel calls).
function toDatetimeLocalValue(isoString: string): string {
  const date = new Date(isoString);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const editTaskFormSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(TASK_TITLE_MAX_LENGTH),
  description: z.string().trim().max(TASK_DESCRIPTION_MAX_LENGTH).optional(),
  dueDate: z.string().min(1, 'Due date is required'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  assignedToId: z.union([
    z.literal(''),
    z.string().uuid({ message: 'Enter a valid User ID (UUID)' }),
  ]),
});
type EditTaskFormValues = z.infer<typeof editTaskFormSchema>;

export interface EditTaskDialogProps {
  task: CrmTask;
  leadId?: string;
}

export function EditTaskDialog({ task, leadId }: EditTaskDialogProps) {
  const [open, setOpen] = useState(false);
  const updateTask = useUpdateTask(task.id, leadId);

  const form = useForm<EditTaskFormValues>({
    resolver: zodResolver(editTaskFormSchema),
    defaultValues: {
      title: task.title,
      description: task.description ?? '',
      dueDate: toDatetimeLocalValue(task.dueDate),
      priority: task.priority,
      assignedToId: task.assignedToId ?? '',
    },
  });

  async function onSubmit(values: EditTaskFormValues) {
    try {
      await updateTask.mutateAsync({
        title: values.title,
        description: values.description || undefined,
        dueDate: new Date(values.dueDate).toISOString(),
        priority: values.priority,
        assignedToId: values.assignedToId === '' ? undefined : values.assignedToId,
      });
      toast.success('Task updated');
      setOpen(false);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Could not update the task.';
      toast.error(message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Edit ${task.title}`}>
          <Pencil className="h-4 w-4" aria-hidden="true" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Due Date</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      className="border-(--color-border-default) bg-(--color-bg-canvas) text-(--color-text-primary) focus-visible:ring-(--color-accent) flex h-9 w-full rounded-md border px-3 text-sm focus-visible:outline-none focus-visible:ring-2"
                    >
                      {TASK_PRIORITY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="assignedToId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assigned User ID (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="00000000-0000-0000-0000-000000000000" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" loading={form.formState.isSubmitting}>
                Save
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
