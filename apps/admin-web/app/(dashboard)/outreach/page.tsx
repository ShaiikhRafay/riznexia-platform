import { Suspense } from 'react';
import { OutreachPage } from '@/src/features/outreach/components/outreach-page';

export default function Page() {
  return (
    <Suspense>
      <OutreachPage />
    </Suspense>
  );
}
