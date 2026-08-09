import { ErrorState, Skeleton, type ApiErrorLike } from '@riznexia/ui';

export interface WidgetCardProps {
  title: string;
  isLoading: boolean;
  error: ApiErrorLike | null;
  onRetry?: () => void;
  children: React.ReactNode;
}

// The one card shell every dashboard widget renders into — loading
// (skeleton), error (inline `<ErrorState/>`, never taking down a sibling
// widget), or its real content. Widgets never build their own
// loading/error presentation.
export function WidgetCard({ title, isLoading, error, onRetry, children }: WidgetCardProps) {
  return (
    <div className="border-(--color-border-default) bg-(--color-bg-surface) flex flex-col gap-2 rounded-lg border p-4">
      <p className="text-caption text-(--color-text-secondary) font-medium">{title}</p>
      {isLoading ? (
        <Skeleton className="h-8 w-24" />
      ) : error ? (
        <ErrorState
          error={error}
          onRetry={onRetry}
          className="items-start gap-1 border-0 bg-transparent p-0 text-left"
        />
      ) : (
        children
      )}
    </div>
  );
}
