import type { UserActivityReport } from '@riznexia/shared-types';
import { formatDateTime } from '../../format';
import { DetailCard } from '../detail-primitives';

export function UserActivityReportView({ data }: { data: UserActivityReport }) {
  return (
    <DetailCard title="User Activity Report">
      {data.byActor.length === 0 ? (
        <p className="text-(--color-text-secondary) text-sm">No user activity recorded.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-(--color-border-default) text-caption text-(--color-text-secondary) border-b">
                <th className="py-2 pr-4 font-medium">Actor</th>
                <th className="py-2 pr-4 font-medium">Actions</th>
                <th className="py-2 font-medium">Last Active</th>
              </tr>
            </thead>
            <tbody>
              {data.byActor.map((entry) => (
                <tr
                  key={entry.actorId ?? 'unknown'}
                  className="border-(--color-border-default) border-b last:border-0"
                >
                  <td className="text-(--color-text-primary) py-2 pr-4">
                    {entry.actorName ?? 'Unknown'}
                  </td>
                  <td className="text-(--color-text-secondary) py-2 pr-4">{entry.actionCount}</td>
                  <td className="text-(--color-text-secondary) py-2">
                    {formatDateTime(entry.lastActiveAt)}
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
