'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { createLeadNoteSchema, type CreateLeadNoteInput } from '@riznexia/shared-types';
import {
  Button,
  ErrorState,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
  Skeleton,
  Textarea,
  toast,
} from '@riznexia/ui';
import { useForm } from 'react-hook-form';
import { PermissionGate } from '@/src/components/auth/permission-gate';
import { ApiError } from '@/src/lib/api-client';
import { useCurrentUser } from '@/src/lib/current-user-context';
import { useCreateLeadNote } from '../../api/use-create-lead-note';
import { useLeadNotes } from '../../api/use-lead-notes';
import { DetailCard } from './detail-card';

// Notes (F4): append-only, newest-first (matches the backend's own
// ordering) — there is no edit/delete affordance anywhere in this panel,
// since no such endpoint exists (`LeadNotesService`: "deliberately no
// update or delete path"). Adding a note is gated on `leads:write`.
export function LeadNotesPanel({ leadId }: { leadId: string }) {
  const currentUser = useCurrentUser();
  const notesQuery = useLeadNotes(leadId);
  const createNote = useCreateLeadNote();
  const form = useForm<CreateLeadNoteInput>({
    resolver: zodResolver(createLeadNoteSchema),
    defaultValues: { body: '' },
  });

  async function onSubmit(values: CreateLeadNoteInput) {
    try {
      await createNote.mutateAsync({ leadId, input: values });
      form.reset({ body: '' });
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Could not add the note.';
      toast.error(message);
    }
  }

  const notes = notesQuery.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <DetailCard title="Notes">
      <PermissionGate permission="leads:write">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-2">
            <FormField
              control={form.control}
              name="body"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea placeholder="Add a note…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button
              type="submit"
              size="sm"
              loading={form.formState.isSubmitting}
              className="self-start"
            >
              Add Note
            </Button>
          </form>
        </Form>
      </PermissionGate>

      {notesQuery.isLoading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : notesQuery.error ? (
        <ErrorState error={notesQuery.error as never} onRetry={() => void notesQuery.refetch()} />
      ) : notes.length === 0 ? (
        <p className="text-(--color-text-secondary) text-sm">No notes yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {notes.map((note) => (
            <li
              key={note.id}
              className="border-(--color-border-default) rounded-md border p-3 text-sm"
            >
              <p className="text-(--color-text-primary) whitespace-pre-wrap">{note.body}</p>
              <p className="text-(--color-text-secondary) mt-2 text-xs">
                {note.authorId === currentUser.id ? 'You' : (note.authorId ?? 'Unknown')} &middot;{' '}
                {new Date(note.createdAt).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      )}

      {notesQuery.hasNextPage ? (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => void notesQuery.fetchNextPage()}
          loading={notesQuery.isFetchingNextPage}
          className="self-start"
        >
          Load more
        </Button>
      ) : null}
    </DetailCard>
  );
}
