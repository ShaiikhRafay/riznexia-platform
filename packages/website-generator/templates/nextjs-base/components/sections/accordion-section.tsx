import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import type { SourcedText, SourcedTextList } from '@/lib/types';

export interface AccordionSectionProps {
  sectionTitle?: SourcedText;
  items: SourcedTextList;
}

// No FAQ question/answer data source exists anywhere in this pipeline yet
// (DECISIONS.md D-061) — `items` is typically absent. Each bound item is a
// single string (no separate question/answer split in the current content
// model), rendered as an expandable entry so the interaction is real and
// keyboard-operable even though the content itself is a placeholder for a
// future richer FAQ data source.
export function AccordionSection({ sectionTitle, items }: AccordionSectionProps) {
  if (items.value.length === 0) {
    return null;
  }

  return (
    <div className="gap-token-md flex flex-col">
      {sectionTitle && (
        <h2 className="font-heading text-2xl font-semibold">{sectionTitle.value}</h2>
      )}
      <Accordion type="single" collapsible>
        {items.value.map((item, index) => (
          <AccordionItem key={item} value={`item-${index}`}>
            <AccordionTrigger>{item}</AccordionTrigger>
            <AccordionContent>{item}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
