import type { IndustryReport } from '@riznexia/shared-types';
import { formatUsd } from '../../format';
import { DetailCard } from '../detail-primitives';

// Industry (F12): unlike Category (raw lead-count distribution), each row
// ties a category to real CRM outcomes (won count, deal value) — rendered
// as a table since it's three numbers per row, not a single proportional
// value a bar list can represent.
export function IndustryReportView({ data }: { data: IndustryReport }) {
  return (
    <DetailCard title="Industry Report">
      {data.byCategory.length === 0 ? (
        <p className="text-(--color-text-secondary) text-sm">No industry data yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-(--color-border-default) text-caption text-(--color-text-secondary) border-b">
                <th className="py-2 pr-4 font-medium">Category</th>
                <th className="py-2 pr-4 font-medium">Leads</th>
                <th className="py-2 pr-4 font-medium">Won</th>
                <th className="py-2 font-medium">Total Deal Value</th>
              </tr>
            </thead>
            <tbody>
              {data.byCategory.map((entry) => (
                <tr
                  key={entry.category}
                  className="border-(--color-border-default) border-b last:border-0"
                >
                  <td className="text-(--color-text-primary) py-2 pr-4">{entry.category}</td>
                  <td className="text-(--color-text-secondary) py-2 pr-4">{entry.leadCount}</td>
                  <td className="text-(--color-text-secondary) py-2 pr-4">{entry.wonCount}</td>
                  <td className="text-(--color-text-primary) py-2">
                    {formatUsd(entry.totalDealValueUsd)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DetailCard>
  );
}
