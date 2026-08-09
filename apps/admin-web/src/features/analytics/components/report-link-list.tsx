import type { ReportType } from '@riznexia/shared-types';
import Link from 'next/link';
import { REPORT_TYPE_LABELS } from '../report-labels';

export interface ReportLinkListProps {
  types: readonly ReportType[];
}

// Deep-links into the single shared Analytics Reports page, pre-selecting
// one of its report types — reused by every themed page (Business/Usage/
// System/Cost Analytics) so each report's real rendering logic lives in
// exactly one place (`reports/report-view.tsx`), never duplicated per
// themed page.
export function ReportLinkList({ types }: ReportLinkListProps) {
  return (
    <ul className="flex flex-wrap gap-3">
      {types.map((type) => (
        <li key={type}>
          <Link
            href={`/analytics/reports?type=${type}`}
            className="border-(--color-border-default) bg-(--color-bg-surface) text-(--color-accent) inline-block rounded-md border px-3 py-1.5 text-sm font-medium hover:underline"
          >
            {REPORT_TYPE_LABELS[type]} →
          </Link>
        </li>
      ))}
    </ul>
  );
}
