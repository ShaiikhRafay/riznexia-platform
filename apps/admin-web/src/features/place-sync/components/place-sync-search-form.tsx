'use client';

import { zodResolver } from '@hookform/resolvers/zod';
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
import { useCreatePlaceSyncJob } from '../api/use-create-place-sync-job';

// Search Parameters (F5): per-field constraints mirror
// `createPlaceSyncJobSchema` exactly (city 1-100, category 1-50, keyword
// 1-100, latitude -90..90, longitude -180..180, radiusMeters positive
// max 50,000, default 15,000). The backend's own cross-field rule (either
// `city` or a lat/long pair is required; a city-only search additionally
// needs `category` or `keyword`) is deliberately NOT duplicated here —
// violating it is caught by the real `POST /place-sync-jobs` validation,
// and the backend's exact message is shown via toast, the same
// "show backend validation errors exactly" pattern used everywhere else
// in this app, rather than re-implementing the same superRefine logic
// twice and risking drift.
const placeSyncFormSchema = z.object({
  city: z.union([z.literal(''), z.string().trim().min(1).max(100)]),
  category: z.union([z.literal(''), z.string().trim().min(1).max(50)]),
  keyword: z.union([z.literal(''), z.string().trim().min(1).max(100)]),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  radiusMeters: z.number().positive().max(50_000),
});
type PlaceSyncFormValues = z.infer<typeof placeSyncFormSchema>;

const DEFAULT_RADIUS_METERS = 15_000;

export interface PlaceSyncSearchFormProps {
  /** Prefills the form from a past job's search params — a client-side "start similar sync" convenience, not a real backend resume (no such capability exists). */
  prefill?: {
    city?: string | null;
    category?: string | null;
    keyword?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    radiusMeters?: number | null;
  };
}

export function PlaceSyncSearchForm({ prefill }: PlaceSyncSearchFormProps) {
  const router = useRouter();
  const createJob = useCreatePlaceSyncJob();
  const form = useForm<PlaceSyncFormValues>({
    resolver: zodResolver(placeSyncFormSchema),
    defaultValues: {
      city: prefill?.city ?? '',
      category: prefill?.category ?? '',
      keyword: prefill?.keyword ?? '',
      latitude: prefill?.latitude ?? undefined,
      longitude: prefill?.longitude ?? undefined,
      radiusMeters: prefill?.radiusMeters ?? DEFAULT_RADIUS_METERS,
    },
  });

  async function onSubmit(values: PlaceSyncFormValues) {
    try {
      const job = await createJob.mutateAsync({
        city: values.city || undefined,
        category: values.category || undefined,
        keyword: values.keyword || undefined,
        latitude: values.latitude,
        longitude: values.longitude,
        radiusMeters: values.radiusMeters,
      });
      toast.success('Synchronization started');
      router.push(`/discovery/sync/${job.id}`);
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : 'Could not start the synchronization.';
      toast.error(message);
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="border-(--color-border-default) bg-(--color-bg-surface) flex flex-col gap-4 rounded-lg border p-4"
      >
        <h2 className="text-h2 text-(--color-text-primary) font-semibold">New Synchronization</h2>

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

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. restaurant" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="keyword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Keyword</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. pizza" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="latitude"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Latitude (optional)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="any"
                    value={field.value ?? ''}
                    onChange={(event) =>
                      field.onChange(
                        Number.isNaN(event.target.valueAsNumber)
                          ? undefined
                          : event.target.valueAsNumber,
                      )
                    }
                    onBlur={field.onBlur}
                    name={field.name}
                    disabled={field.disabled}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="longitude"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Longitude (optional)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="any"
                    value={field.value ?? ''}
                    onChange={(event) =>
                      field.onChange(
                        Number.isNaN(event.target.valueAsNumber)
                          ? undefined
                          : event.target.valueAsNumber,
                      )
                    }
                    onBlur={field.onBlur}
                    name={field.name}
                    disabled={field.disabled}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="radiusMeters"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Radius (meters)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  max={50_000}
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
          Start Synchronization
        </Button>
      </form>
    </Form>
  );
}
