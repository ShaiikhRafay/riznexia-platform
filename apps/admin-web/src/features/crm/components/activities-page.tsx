'use client';

import { ErrorState, Skeleton, Tabs, TabsContent, TabsList, TabsTrigger } from '@riznexia/ui';
import { useSearchParams, useRouter } from 'next/navigation';
import { useLeadActivity } from '@/src/features/leads/api/use-lead-activity';
import { useLeadNotes } from '@/src/features/leads/api/use-lead-notes';
import { ActivityList } from './activity-list';
import { CrmViewGate } from './crm-view-gate';
import { LeadSelect } from './lead-select';

// Activities (F10): "Display: Calls, Meetings, Emails, WhatsApp, Notes.
// Read exactly from backend. Never merge or infer activity types."
// There is no cross-lead activity feed on the backend (`GET
// /leads/:id/activity` is per-lead only) — same "Select Lead" resolution
// F6-F9's own Dashboards use for their own per-lead-only resources.
// Reuses F4's `useLeadActivity()`/`useLeadNotes()` directly. "Notes" is
// never merged into the activity array — it's a genuinely separate
// backend entity (`LeadNote`, not a `LeadActivityType`), rendered from
// its own hook in its own tab (DECISIONS.md D-180).
export function ActivitiesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedLeadId = searchParams.get('leadId');

  function selectLead(leadId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('leadId', leadId);
    router.push(`?${params.toString()}`);
  }

  return (
    <CrmViewGate>
      <div className="flex flex-col gap-6">
        <h1 className="text-h1 text-(--color-text-primary) font-semibold">Activities</h1>
        <LeadSelect value={selectedLeadId} onChange={(leadId) => selectLead(leadId)} />
        {selectedLeadId ? <LeadActivityCategories leadId={selectedLeadId} /> : null}
      </div>
    </CrmViewGate>
  );
}

function LeadActivityCategories({ leadId }: { leadId: string }) {
  const activity = useLeadActivity(leadId);
  const notes = useLeadNotes(leadId);

  if (activity.isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }
  if (activity.error) {
    return <ErrorState error={activity.error} onRetry={() => void activity.refetch()} />;
  }

  const allActivities = activity.data?.pages.flatMap((page) => page.items) ?? [];
  const allNotes = notes.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <Tabs defaultValue="call">
      <TabsList>
        <TabsTrigger value="call">Calls</TabsTrigger>
        <TabsTrigger value="meeting">Meetings</TabsTrigger>
        <TabsTrigger value="email">Emails</TabsTrigger>
        <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
        <TabsTrigger value="notes">Notes</TabsTrigger>
      </TabsList>
      <TabsContent value="call">
        <ActivityList activities={allActivities.filter((item) => item.type === 'call')} />
      </TabsContent>
      <TabsContent value="meeting">
        <ActivityList activities={allActivities.filter((item) => item.type === 'meeting')} />
      </TabsContent>
      <TabsContent value="email">
        <ActivityList activities={allActivities.filter((item) => item.type === 'email')} />
      </TabsContent>
      <TabsContent value="whatsapp">
        <ActivityList activities={allActivities.filter((item) => item.type === 'whatsapp')} />
      </TabsContent>
      <TabsContent value="notes">
        {notes.isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : notes.error ? (
          <ErrorState error={notes.error} onRetry={() => void notes.refetch()} />
        ) : allNotes.length === 0 ? (
          <p className="text-(--color-text-secondary) text-sm">No notes yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {allNotes.map((note) => (
              <li
                key={note.id}
                className="border-(--color-border-default) rounded-lg border p-3 text-sm"
              >
                <p className="text-(--color-text-primary)">{note.body}</p>
                <p className="text-(--color-text-secondary) text-xs">
                  {new Date(note.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </TabsContent>
    </Tabs>
  );
}
