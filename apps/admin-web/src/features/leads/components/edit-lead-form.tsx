'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { leadTagsSchema, PIPELINE_STAGES, type Lead } from '@riznexia/shared-types';
import {
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  toast,
} from '@riznexia/ui';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ApiError } from '@/src/lib/api-client';
import { useUpdateLead } from '../api/use-update-lead';
import { LEAD_STAGE_OPTIONS } from '../lead-stage';
import { TagInput } from './tag-input';

// Edit Lead (F4): `PATCH /leads/:id`. `businessId` is not editable — a
// Lead's business relation is fixed at creation (no endpoint changes it).
// `assignedTo` is always sent explicitly (a UUID or `null`), never
// omitted — this form's full-object submit distinguishes "cleared" from
// "left alone" the same way `updateLeadSchema` does, just always taking
// the explicit branch rather than the omit one.
const editLeadFormSchema = z.object({
  pipelineStage: z.enum(PIPELINE_STAGES),
  assignedTo: z.union([
    z.literal(''),
    z.string().uuid({ message: 'Enter a valid User ID (UUID)' }),
  ]),
  tags: leadTagsSchema,
});
type EditLeadFormValues = z.infer<typeof editLeadFormSchema>;

export interface EditLeadFormProps {
  lead: Lead;
}

export function EditLeadForm({ lead }: EditLeadFormProps) {
  const router = useRouter();
  const updateLead = useUpdateLead();
  const form = useForm<EditLeadFormValues>({
    resolver: zodResolver(editLeadFormSchema),
    defaultValues: {
      pipelineStage: lead.pipelineStage,
      assignedTo: lead.assignedTo ?? '',
      tags: lead.tags,
    },
  });

  async function onSubmit(values: EditLeadFormValues) {
    try {
      await updateLead.mutateAsync({
        leadId: lead.id,
        input: {
          pipelineStage: values.pipelineStage,
          assignedTo: values.assignedTo === '' ? null : values.assignedTo,
          tags: values.tags,
        },
      });
      toast.success('Lead updated');
      router.push(`/leads/${lead.id}`);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Could not update the lead.';
      toast.error(message);
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="border-(--color-border-default) bg-(--color-bg-surface) flex flex-col gap-4 rounded-lg border p-4"
      >
        <FormField
          control={form.control}
          name="pipelineStage"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Stage</FormLabel>
              <FormControl>
                <select
                  {...field}
                  className="border-(--color-border-default) bg-(--color-bg-canvas) text-(--color-text-primary) focus-visible:ring-(--color-accent) flex h-9 w-full rounded-md border px-3 text-sm focus-visible:outline-none focus-visible:ring-2"
                >
                  {LEAD_STAGE_OPTIONS.map((option) => (
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
          name="assignedTo"
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

        <FormField
          control={form.control}
          name="tags"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tags</FormLabel>
              <FormControl>
                <TagInput value={field.value} onChange={field.onChange} disabled={field.disabled} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2">
          <Button type="submit" loading={form.formState.isSubmitting}>
            Save Changes
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push(`/leads/${lead.id}`)}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Form>
  );
}
