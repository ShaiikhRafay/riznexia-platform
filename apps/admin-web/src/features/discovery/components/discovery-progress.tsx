import type { DiscoveryJobStatus } from '@riznexia/shared-types';
import { cn, StatusBadge } from '@riznexia/ui';
import { DISCOVERY_STATUS_PRESENTATION } from '../status';

const STEPS: readonly DiscoveryJobStatus[] = ['queued', 'running', 'completed'];

// Discovery Progress (approved F3 architecture): status-based, not
// percentage-based. Renders the three normal-path steps and highlights
// however far the job has actually reached; `failed` is shown as its own
// terminal badge rather than forced onto the linear track, since a
// failure can happen from either `queued` or `running` and isn't itself
// a "fourth step."
export function DiscoveryProgress({ status }: { status: DiscoveryJobStatus }) {
  if (status === 'failed') {
    return (
      <div className="flex items-center gap-2">
        <StatusBadge variant="danger" label="Failed" />
        <span className="text-(--color-text-secondary) text-sm">This search did not complete.</span>
      </div>
    );
  }

  const currentIndex = STEPS.indexOf(status);

  return (
    <ol className="flex items-center gap-2" aria-label="Discovery progress">
      {STEPS.map((step, index) => {
        const presentation = DISCOVERY_STATUS_PRESENTATION[step];
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
