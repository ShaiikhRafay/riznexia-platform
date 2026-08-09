import type { PlaceSyncJobStatus } from '@riznexia/shared-types';
import { cn, StatusBadge } from '@riznexia/ui';
import { PLACE_SYNC_STATUS_PRESENTATION } from '../status';

const STEPS: readonly PlaceSyncJobStatus[] = ['queued', 'running', 'completed'];

// Progress (F5 scope): status-based, never a percentage — there is no
// live created/updated/failed tally while running (those counters are
// written once, at completion, not streamed), so a numeric progress bar
// would either be fake or stuck at 0% until the very end. Renders the
// three normal-path steps, plus two distinct terminal branches: `failed`
// (the run crashed) and `partial` (the run finished, but some businesses
// failed individually) — these are two different real outcomes, not one
// generic "didn't work" state, so they get separate badges/messages
// rather than being collapsed into a single "failed" branch the way
// Discovery's two-outcome status set allowed.
export function PlaceSyncProgress({ status }: { status: PlaceSyncJobStatus }) {
  if (status === 'failed') {
    return (
      <div className="flex items-center gap-2">
        <StatusBadge variant="danger" label="Failed" />
        <span className="text-(--color-text-secondary) text-sm">
          This synchronization did not complete.
        </span>
      </div>
    );
  }

  if (status === 'partial') {
    return (
      <div className="flex items-center gap-2">
        <StatusBadge variant="warning" label="Partial" />
        <span className="text-(--color-text-secondary) text-sm">
          Finished, but some businesses failed to sync.
        </span>
      </div>
    );
  }

  const currentIndex = STEPS.indexOf(status);

  return (
    <ol className="flex items-center gap-2" aria-label="Synchronization progress">
      {STEPS.map((step, index) => {
        const presentation = PLACE_SYNC_STATUS_PRESENTATION[step];
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
