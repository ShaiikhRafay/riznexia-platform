import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { gridColumnsClassName } from '@/lib/grid-columns';
import type { SourcedText, SourcedTextList } from '@/lib/types';

export interface ProfileGridProps {
  sectionTitle?: SourcedText;
  items?: SourcedTextList;
  columns: { mobile: number; tablet: number; desktop: number };
}

// Renders team/staff/attorney/provider/agent profile names — no upstream
// data source exists for individual profiles yet (DECISIONS.md D-061), so
// `items` is typically absent; the component still renders correctly
// whenever real data does exist.
export function ProfileGrid({ sectionTitle, items, columns }: ProfileGridProps) {
  if (!items || items.value.length === 0) {
    return null;
  }

  return (
    <div className="gap-token-md flex flex-col">
      {sectionTitle && (
        <h2 className="font-heading text-2xl font-semibold">{sectionTitle.value}</h2>
      )}
      <ul className={gridColumnsClassName(columns)}>
        {items.value.map((name) => (
          <li key={name} className="list-none">
            <Card>
              <CardContent className="gap-token-sm pt-token-md flex flex-col items-center text-center">
                <div aria-hidden="true" className="bg-secondary h-16 w-16 rounded-full" />
                <CardTitle>{name}</CardTitle>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
