import type { SourcedText, SourcedTextList } from '@/lib/types';

export interface ScheduleTableProps {
  sectionTitle?: SourcedText;
  rows: SourcedTextList;
}

// No class-schedule data source exists anywhere in this pipeline yet
// (DECISIONS.md D-061) — `rows` is typically absent. Real semantic
// <table> markup (not a styled <div> grid) so screen readers announce
// row/column relationships correctly once real schedule data exists.
export function ScheduleTable({ sectionTitle, rows }: ScheduleTableProps) {
  if (rows.value.length === 0) {
    return null;
  }

  return (
    <div className="gap-token-md flex flex-col">
      {sectionTitle && (
        <h2 className="font-heading text-2xl font-semibold">{sectionTitle.value}</h2>
      )}
      <table className="border-border w-full border-collapse overflow-hidden rounded-lg border text-left">
        <caption className="sr-only">{sectionTitle?.value ?? 'Schedule'}</caption>
        <tbody>
          {rows.value.map((row) => (
            <tr key={row} className="border-border border-b last:border-b-0">
              <td className="px-token-md py-token-sm">{row}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
