import { Skeleton } from '@riznexia/ui';

// Next's `loading.tsx` convention wraps this whole segment (including the
// layout's own async `/me` fetch) in a Suspense boundary automatically —
// skeletons, not a spinner, per docs/17 §18's "predictable shape" rule.
export default function DashboardLoading() {
  return (
    <div className="flex min-h-screen">
      <div className="border-(--color-border-default) bg-(--color-bg-surface) hidden w-60 shrink-0 border-r lg:block" />
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-(--color-border-default) flex h-14 items-center border-b px-4">
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="mx-auto flex w-full max-w-[1440px] flex-1 flex-col gap-4 p-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    </div>
  );
}
