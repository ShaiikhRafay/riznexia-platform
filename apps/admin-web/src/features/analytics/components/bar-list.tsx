export interface BarListItem {
  key: string;
  label: string;
  value: number;
  valueLabel: string;
}

export interface BarListProps {
  items: readonly BarListItem[];
  emptyMessage?: string;
}

// Reused across every report breakdown in this feature (byModel, byStatus,
// byCategory, byProvider, byTheme, byActor, ...) — a hand-rolled
// proportional horizontal bar list, same "no charting library, a single
// bar against the section's own max is well-defined small logic" precedent
// F2's `CrmPipelineSection` already established for this codebase, not a
// new visualization strategy.
export function BarList({ items, emptyMessage = 'No data yet.' }: BarListProps) {
  if (items.length === 0) {
    return <p className="text-(--color-text-secondary) text-sm">{emptyMessage}</p>;
  }

  const maxValue = Math.max(1, ...items.map((item) => item.value));

  return (
    <ul className="flex flex-col gap-2">
      {items.map((item) => (
        <li key={item.key} className="flex items-center gap-3">
          <span className="text-(--color-text-secondary) w-32 shrink-0 truncate text-sm">
            {item.label}
          </span>
          <div className="bg-(--color-bg-surface-raised) h-2 flex-1 overflow-hidden rounded-full">
            <div
              className="bg-(--color-accent) h-full rounded-full"
              style={{ width: `${(item.value / maxValue) * 100}%` }}
            />
          </div>
          <span className="text-(--color-text-primary) w-20 shrink-0 text-right text-sm">
            {item.valueLabel}
          </span>
        </li>
      ))}
    </ul>
  );
}
