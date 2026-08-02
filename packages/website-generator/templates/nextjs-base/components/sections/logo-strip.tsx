import { Badge } from '@/components/ui/badge';
import type { SourcedTextList } from '@/lib/types';

export interface LogoStripProps {
  logos: SourcedTextList;
}

// No client-logo data source exists anywhere in this pipeline yet
// (DECISIONS.md D-061), so `logos` is typically absent — renders nothing
// rather than fabricated placeholder logos. Structurally ready for real
// image-based logos once that data exists.
export function LogoStrip({ logos }: LogoStripProps) {
  if (logos.value.length === 0) {
    return null;
  }

  return (
    <ul
      className="gap-token-md flex flex-wrap items-center justify-center"
      aria-label="Featured clients and partners"
    >
      {logos.value.map((logo) => (
        <li key={logo} className="list-none">
          <Badge variant="outline">{logo}</Badge>
        </li>
      ))}
    </ul>
  );
}
