import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { gridColumnsClassName } from '@/lib/grid-columns';
import type { SourcedText, SourcedTextList } from '@/lib/types';

export interface PricingTableProps {
  sectionTitle?: SourcedText;
  plans: SourcedTextList;
}

// No pricing-plan data source exists anywhere in this pipeline yet
// (DECISIONS.md D-061) — `plans` is typically absent.
export function PricingTable({ sectionTitle, plans }: PricingTableProps) {
  if (plans.value.length === 0) {
    return null;
  }

  return (
    <div className="gap-token-md flex flex-col">
      {sectionTitle && (
        <h2 className="font-heading text-2xl font-semibold">{sectionTitle.value}</h2>
      )}
      <ul className={gridColumnsClassName({ mobile: 1, tablet: 2, desktop: 3 })}>
        {plans.value.map((plan) => (
          <li key={plan} className="list-none">
            <Card>
              <CardContent className="pt-token-md">
                <CardTitle>{plan}</CardTitle>
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
