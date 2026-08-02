import type { SourcedTextList } from '@/lib/types';

export interface SidebarProps {
  items?: SourcedTextList;
}

// No registered M7 theme uses navigationStyle: 'sidebar' today (Module
// M8.1's own forward-compatibility note) — `items` is typically absent,
// so this renders nothing rather than an empty <aside> landmark.
export function Sidebar({ items }: SidebarProps) {
  if (!items || items.value.length === 0) {
    return null;
  }

  return (
    <aside
      aria-label="Sidebar"
      className="gap-token-sm border-border px-token-md flex flex-col border-l"
    >
      <ul>
        {items.value.map((item) => (
          <li key={item} className="py-token-xs text-sm">
            {item}
          </li>
        ))}
      </ul>
    </aside>
  );
}
