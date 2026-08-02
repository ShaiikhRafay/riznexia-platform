import { Separator } from '@/components/ui/separator';
import type { SourcedText, SourcedTextList } from '@/lib/types';

export interface MenuListProps {
  sectionTitle?: SourcedText;
  items: SourcedTextList;
}

export function MenuList({ sectionTitle, items }: MenuListProps) {
  return (
    <div className="gap-token-md flex flex-col">
      {sectionTitle && (
        <h2 className="font-heading text-2xl font-semibold">{sectionTitle.value}</h2>
      )}
      <ul className="gap-token-sm mx-auto flex max-w-2xl flex-col">
        {items.value.map((item, index) => (
          <li key={item}>
            <p className="py-token-xs text-base">{item}</p>
            {index < items.value.length - 1 && <Separator />}
          </li>
        ))}
      </ul>
    </div>
  );
}
