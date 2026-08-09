'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { createDomainSchema, type CreateDomainInput } from '@riznexia/shared-types';
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
  toast,
} from '@riznexia/ui';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { ApiError } from '@/src/lib/api-client';
import { useCreateDomain } from '../api/use-create-domain';

export interface RegisterDomainDialogProps {
  leadId: string;
}

// Domain Management (F11): `POST /leads/:id/domains` — `type` is a real,
// required field (`custom`|`subdomain`); `provider` is never a form field,
// since the backend sets it itself (DECISIONS.md, Domain Engine Decision
// 2 as documented in `domain.ts`).
export function RegisterDomainDialog({ leadId }: RegisterDomainDialogProps) {
  const [open, setOpen] = useState(false);
  const createDomain = useCreateDomain(leadId);

  const form = useForm<CreateDomainInput>({
    resolver: zodResolver(createDomainSchema),
    defaultValues: { hostname: '', type: 'custom' },
  });

  async function onSubmit(values: CreateDomainInput) {
    try {
      await createDomain.mutateAsync(values);
      toast.success('Domain registered');
      form.reset();
      setOpen(false);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Could not register this domain.';
      toast.error(message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">Register Domain</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Register Domain</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="hostname"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hostname</FormLabel>
                  <FormControl>
                    <Input placeholder="example.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      className="border-(--color-border-default) bg-(--color-bg-canvas) text-(--color-text-primary) focus-visible:ring-(--color-accent) flex h-9 w-full rounded-md border px-3 text-sm focus-visible:outline-none focus-visible:ring-2"
                    >
                      <option value="custom">Custom</option>
                      <option value="subdomain">Subdomain</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit" loading={form.formState.isSubmitting}>
                Register Domain
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
