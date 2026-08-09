'use client';

import { Button } from '@riznexia/ui';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { CreateLeadForm } from './create-lead-form';

export function CreateLeadPage() {
  return (
    <div className="flex flex-col gap-6">
      <Button variant="ghost" size="sm" asChild className="self-start">
        <Link href="/leads">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Leads
        </Link>
      </Button>
      <h1 className="text-h1 text-(--color-text-primary) font-semibold">Create Lead</h1>
      <CreateLeadForm />
    </div>
  );
}
