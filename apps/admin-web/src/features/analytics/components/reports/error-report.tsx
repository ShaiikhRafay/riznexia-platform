import type { ErrorReport } from '@riznexia/shared-types';
import { DetailCard, FieldRow } from '../detail-primitives';

export function ErrorReportView({ data }: { data: ErrorReport }) {
  return (
    <DetailCard title="Error Report">
      <FieldRow label="Total Errors">{data.totalErrors}</FieldRow>
      {data.byModule.length === 0 ? (
        <p className="text-(--color-text-secondary) text-sm">No errors recorded.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {data.byModule.map((entry) => (
            <li
              key={entry.module}
              className="border-(--color-border-default) rounded-md border p-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-(--color-text-primary) text-sm font-medium">
                  {entry.module}
                </span>
                <span className="text-(--color-text-secondary) text-sm">
                  {entry.failedCount} failed
                </span>
              </div>
              {entry.sampleMessages.length > 0 ? (
                <ul className="text-(--color-text-secondary) mt-2 list-inside list-disc text-xs">
                  {entry.sampleMessages.map((message, index) => (
                    <li key={index}>{message}</li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </DetailCard>
  );
}
