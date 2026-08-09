'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { leadTagsSchema, PIPELINE_STAGES } from '@riznexia/shared-types';
import {
  Button,
  Form,
  FormControl,
  FormDescription,
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
import { useCreateLead } from '../api/use-create-lead';
import { LEAD_STAGE_OPTIONS } from '../lead-stage';
import { TagInput } from './tag-input';

// Create Lead (F4, founder-approved resolution): `POST /leads` requires an
// existing `businessId` and there is no endpoint anywhere to list/search
// businesses — so this form takes a raw Business ID (UUID). A known,
// flagged limitation (see docs/frontend/f4-review.md), not an invented
// business-search capability.
//
// A separate, form-local schema (not `createLeadSchema` directly) exists
// only because a plain text input naturally produces `''`, not
// `undefined` — `assignedTo` here accepts `''` or a UUID, translated to
// `undefined` before the real `createLeadSchema`-shaped payload is sent;
// the backend re-validates the actual payload regardless.
const createLeadFormSchema = z.object({
  businessId: z.string().uuid({ message: 'Enter a valid Business ID (UUID)' }),
  pipelineStage: z.enum(PIPELINE_STAGES),
  assignedTo: z.union([
    z.literal(''),
    z.string().uuid({ message: 'Enter a valid User ID (UUID)' }),
  ]),
  tags: leadTagsSchema,
});
type CreateLeadFormValues = z.infer<typeof createLeadFormSchema>;

export function CreateLeadForm() {
  const router = useRouter();
  const createLead = useCreateLead();
  const form = useForm<CreateLeadFormValues>({
    resolver: zodResolver(createLeadFormSchema),
    defaultValues: { businessId: '', pipelineStage: 'new', assignedTo: '', tags: [] },
  });

  async function onSubmit(values: CreateLeadFormValues) {
    try {
      const lead = await createLead.mutateAsync({
        businessId: values.businessId,
        pipelineStage: values.pipelineStage,
        assignedTo: values.assignedTo === '' ? undefined : values.assignedTo,
        tags: values.tags,
      });
      toast.success(`Lead created for ${lead.businessName}`);
      router.push(`/leads/${lead.id}`);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Could not create the lead.';
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
          name="businessId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Business ID</FormLabel>
              <FormControl>
                <Input placeholder="00000000-0000-0000-0000-000000000000" {...field} />
              </FormControl>
              <FormDescription>
                The UUID of an existing business. There is currently no business search — paste a
                known ID.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

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

        <Button type="submit" loading={form.formState.isSubmitting} className="self-start">
          Create Lead
        </Button>
      </form>
    </Form>
  );
}
