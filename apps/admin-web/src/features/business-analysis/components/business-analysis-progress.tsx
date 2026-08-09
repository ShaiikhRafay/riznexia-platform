import type { AnalysisStatus } from '@riznexia/shared-types';
import { cn, StatusBadge } from '@riznexia/ui';
import { ANALYSIS_STATUS_PRESENTATION } from '../status';

const STEPS: readonly AnalysisStatus[] = ['pending', 'completed'];

// Progress (F6): status-based, never simulated — there is no
// intermediate "running"/"processing" state (the AI call is
// fire-and-forget from the trigger request's perspective; the row simply
// flips from `pending` straight to `completed` or `failed` once the
// runner finishes), so the normal-path track has only two steps, not
// three like Discovery/Place Sync's queued→running→completed. `failed`
// is its own terminal branch, same pattern as the other two modules.
export function BusinessAnalysisProgress({ status }: { status: AnalysisStatus }) {
  if (status === 'failed') {
    return (
      <div className="flex items-center gap-2">
        <StatusBadge variant="danger" label="Failed" />
        <span className="text-(--color-text-secondary) text-sm">
          This analysis did not complete.
        </span>
      </div>
    );
  }

  const currentIndex = STEPS.indexOf(status);

  return (
    <ol className="flex items-center gap-2" aria-label="Analysis progress">
      {STEPS.map((step, index) => {
        const presentation = ANALYSIS_STATUS_PRESENTATION[step];
        const reached = index <= currentIndex;
        return (
          <li key={step} className="flex items-center gap-2">
            <div
              className={cn(
                'text-caption flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium',
                reached
                  ? 'bg-(--color-accent) text-(--color-accent-foreground)'
                  : 'bg-(--color-bg-surface-raised) text-(--color-text-secondary)',
              )}
              aria-current={index === currentIndex ? 'step' : undefined}
            >
              {presentation.label}
            </div>
            {index < STEPS.length - 1 ? (
              <div
                className={cn(
                  'h-px w-6',
                  reached && index < currentIndex
                    ? 'bg-(--color-accent)'
                    : 'bg-(--color-border-default)',
                )}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
