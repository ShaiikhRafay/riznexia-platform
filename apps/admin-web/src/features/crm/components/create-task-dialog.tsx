'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { TASK_TITLE_MAX_LENGTH, TASK_DESCRIPTION_MAX_LENGTH } from '@riznexia/shared-types';
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
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ApiError } from '@/src/lib/api-client';
import { useCreateTask } from '../api/use-create-task';
import { TASK_PRIORITY_OPTIONS } from '../status';
import { LeadSelect } from './lead-select';

// Tasks — Create (F10): `POST /leads/:id/tasks` requires a `leadId` in the
// URL, not the body — when this dialog is opened without a fixed
// `leadId` (from the global Tasks page, rather than a specific lead's
// page), the form's first field is `LeadSelect`, and submission is
// disabled until a lead is chosen. There is no `assignedToId` picker
// beyond a raw UUID input — same flagged limitation as F4's own
// `assignedTo` field (no team-member-list endpoint exists).
const createTaskFormSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(TASK_TITLE_MAX_LENGTH),
  description: z.string().trim().max(TASK_DESCRIPTION_MAX_LENGTH).optional(),
  dueDate: z.string().min(1, 'Due date is required'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  assignedToId: z.union([
    z.literal(''),
    z.string().uuid({ message: 'Enter a valid User ID (UUID)' }),
  ]),
});
type CreateTaskFormValues = z.infer<typeof createTaskFormSchema>;

export interface CreateTaskDialogProps {
  leadId?: string;
  trigger?: React.ReactNode;
}

export function CreateTaskDialog({ leadId: fixedLeadId, trigger }: CreateTaskDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(fixedLeadId ?? null);
  const [selectedLeadName, setSelectedLeadName] = useState<string | null>(null);
  const effectiveLeadId = fixedLeadId ?? selectedLeadId;
  const createTask = useCreateTask(effectiveLeadId ?? '');

  const form = useForm<CreateTaskFormValues>({
    resolver: zodResolver(createTaskFormSchema),
    defaultValues: {
      title: '',
      description: '',
      dueDate: '',
      priority: 'medium',
      assignedToId: '',
    },
  });

  async function onSubmit(values: CreateTaskFormValues) {
    if (!effectiveLeadId) {
      return;
    }
    try {
      await createTask.mutateAsync({
        title: values.title,
        description: values.description || undefined,
        dueDate: new Date(values.dueDate).toISOString(),
        priority: values.priority,
        assignedToId: values.assignedToId === '' ? undefined : values.assignedToId,
      });
      toast.success('Task created');
      form.reset();
      setSelectedLeadId(fixedLeadId ?? null);
      setSelectedLeadName(null);
      setOpen(false);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Could not create the task.';
      toast.error(message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger ?? <Button size="sm">New Task</Button>}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Task</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            {!fixedLeadId ? (
              <div className="flex flex-col gap-2">
                <span className="text-(--color-text-primary) text-sm font-medium">Lead</span>
                {selectedLeadName ? (
                  <p className="text-(--color-text-secondary) text-sm">
                    {selectedLeadName}{' '}
                    <button
                      type="button"
                      className="text-(--color-accent) hover:underline"
                      onClick={() => {
                        setSelectedLeadId(null);
                        setSelectedLeadName(null);
                      }}
                    >
                      Change
                    </button>
                  </p>
                ) : (
                  <LeadSelect
                    value={selectedLeadId}
                    onChange={(id, name) => {
                      setSelectedLeadId(id);
                      setSelectedLeadName(name);
                    }}
                  />
                )}
              </div>
            ) : null}

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
              <Button
                type="submit"
                loading={form.formState.isSubmitting}
                disabled={!effectiveLeadId}
              >
                Create Task
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
