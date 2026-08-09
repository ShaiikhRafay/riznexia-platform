'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { createDiscoveryJobSchema, type CreateDiscoveryJobInput } from '@riznexia/shared-types';
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
import { useForm } from 'react-hook-form';
import { ApiError } from '@/src/lib/api-client';
import { useCreateDiscoveryJob } from '../api/use-create-discovery-job';
import { CategoryInput } from './category-input';

const MAX_CATEGORIES = 5;

// Search Filters (approved F3 architecture): exactly `createDiscoveryJobSchema`'s
// three fields — city, categories (1-5), radiusKm — validated against the
// same schema the backend enforces, never a hand-written parallel one.
export function DiscoverySearchForm() {
  const createJob = useCreateDiscoveryJob();
  const form = useForm<CreateDiscoveryJobInput>({
    resolver: zodResolver(createDiscoveryJobSchema),
    defaultValues: { city: '', categories: [], radiusKm: 15 },
  });

  async function onSubmit(values: CreateDiscoveryJobInput) {
    try {
      const jobs = await createJob.mutateAsync(values);
      toast.success(
        `Started ${jobs.length} discovery ${jobs.length === 1 ? 'job' : 'jobs'} for ${values.city}`,
      );
      form.reset({ city: '', categories: [], radiusKm: 15 });
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : 'Could not start the discovery search.';
      toast.error(message);
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="border-(--color-border-default) bg-(--color-bg-surface) flex flex-col gap-4 rounded-lg border p-4"
      >
        <h2 className="text-h2 text-(--color-text-primary) font-semibold">New Search</h2>

        <FormField
          control={form.control}
          name="city"
          render={({ field }) => (
            <FormItem>
              <FormLabel>City</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Karachi" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="categories"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Categories</FormLabel>
              <FormControl>
                <CategoryInput
                  value={field.value}
                  onChange={field.onChange}
                  max={MAX_CATEGORIES}
                  disabled={field.disabled}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="radiusKm"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Radius (km)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  max={50}
                  step={1}
                  value={field.value}
                  onChange={(event) => field.onChange(event.target.valueAsNumber)}
                  onBlur={field.onBlur}
                  name={field.name}
                  disabled={field.disabled}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" loading={form.formState.isSubmitting} className="self-start">
          Start Search
        </Button>
      </form>
    </Form>
  );
}
