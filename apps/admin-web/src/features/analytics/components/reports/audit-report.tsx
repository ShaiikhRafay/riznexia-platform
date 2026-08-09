import type { AuditReport } from '@riznexia/shared-types';
import { formatDateTime } from '../../format';
import { DetailCard } from '../detail-primitives';

// Embedded view for the generic Reports page (`type=audit`) — shows the
// first returned page only, plain table, same convention as this
// feature's other non-paginated report renderers. The dedicated Audit
// Logs page (`audit-logs-page.tsx`) is the real place to browse the full
// paginated history (real Prev/Next over the backend's own cursor).
export function AuditReportView({ data }: { data: AuditReport }) {
  return (
    <DetailCard title="Audit Report">
      {data.items.length === 0 ? (
        <p className="text-(--color-text-secondary) text-sm">No audit entries yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-(--color-border-default) text-caption text-(--color-text-secondary) border-b">
                <th className="py-2 pr-4 font-medium">Time</th>
                <th className="py-2 pr-4 font-medium">Action</th>
                <th className="py-2 pr-4 font-medium">Entity Type</th>
                <th className="py-2 font-medium">Entity ID</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((entry) => (
                <tr
                  key={entry.id}
                  className="border-(--color-border-default) border-b last:border-0"
                >
                  <td className="text-(--color-text-primary) py-2 pr-4">
                    {formatDateTime(entry.createdAt)}
                  </td>
                  <td className="text-(--color-text-secondary) py-2 pr-4">{entry.action}</td>
                  <td className="text-(--color-text-secondary) py-2 pr-4">{entry.entityType}</td>
                  <td className="text-(--color-text-secondary) py-2">{entry.entityId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DetailCard>
  );
}
