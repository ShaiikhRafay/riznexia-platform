'use client';

import { Card, CardContent, CardHeader, CardTitle, ErrorState, Skeleton } from '@riznexia/ui';
import { useState } from 'react';
import { PermissionGate } from '@/src/components/auth/permission-gate';
import { useCrmReports } from '../api/use-crm-reports';
import { formatPercent, formatUsd } from '../format';
import { CrmViewGate } from './crm-view-gate';

// Reports (F10): "Display backend reports exactly. Never calculate:
// Pipeline Value, Conversion Rate, Win Rate, Lost Reasons, Sales
// Performance. These come from the backend." Every number below is a
// direct field from `DashboardStats` — no client-side aggregation beyond
// picking which already-computed field to show in which column.
export function ReportsPage() {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const { data, isLoading, error, refetch } = useCrmReports({
    fromDate: fromDate ? new Date(fromDate).toISOString() : undefined,
    toDate: toDate ? new Date(toDate).toISOString() : undefined,
  });

  return (
    <CrmViewGate>
      <div className="flex flex-col gap-6">
        <h1 className="text-h1 text-(--color-text-primary) font-semibold">Reports</h1>

        <PermissionGate
          permission="crm:report"
          fallback={
            <p className="text-(--color-text-secondary) text-sm">
              You don&rsquo;t have permission to view CRM reports.
            </p>
          }
        >
          <div className="flex flex-wrap items-center gap-4">
            <label className="text-(--color-text-primary) flex items-center gap-2 text-sm">
              From
              <input
                type="date"
                value={fromDate}
                onChange={(event) => setFromDate(event.target.value)}
                className="border-(--color-border-default) bg-(--color-bg-canvas) text-(--color-text-primary) focus-visible:ring-(--color-accent) h-9 rounded-md border px-3 text-sm focus-visible:outline-none focus-visible:ring-2"
              />
            </label>
            <label className="text-(--color-text-primary) flex items-center gap-2 text-sm">
              To
              <input
                type="date"
                value={toDate}
                onChange={(event) => setToDate(event.target.value)}
                className="border-(--color-border-default) bg-(--color-bg-canvas) text-(--color-text-primary) focus-visible:ring-(--color-accent) h-9 rounded-md border px-3 text-sm focus-visible:outline-none focus-visible:ring-2"
              />
            </label>
          </div>

          {isLoading ? (
            <Skeleton className="h-96 w-full" />
          ) : error ? (
            <ErrorState error={error} onRetry={() => void refetch()} />
          ) : data ? (
            <div className="flex flex-col gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Pipeline Value by Stage</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-(--color-border-default) text-caption text-(--color-text-secondary) border-b">
                          <th className="py-2 pr-4 font-medium">Stage</th>
                          <th className="py-2 pr-4 font-medium">Leads</th>
                          <th className="py-2 font-medium">Total Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.pipelineValueByStage.map((stage) => (
                          <tr
                            key={stage.stageId}
                            className="border-(--color-border-default) border-b last:border-0"
                          >
                            <td className="text-(--color-text-primary) py-2 pr-4">
                              {stage.stageName}
                            </td>
                            <td className="text-(--color-text-secondary) py-2 pr-4">
                              {stage.leadCount}
                            </td>
                            <td className="text-(--color-text-primary) py-2">
                              {formatUsd(stage.totalValueUsd)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="text-(--color-text-secondary) mt-2 text-sm">
                      Total: {formatUsd(data.totalPipelineValueUsd)}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Sales Performance by Rep</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-(--color-border-default) text-caption text-(--color-text-secondary) border-b">
                          <th className="py-2 pr-4 font-medium">Rep</th>
                          <th className="py-2 pr-4 font-medium">Open</th>
                          <th className="py-2 pr-4 font-medium">Won</th>
                          <th className="py-2 pr-4 font-medium">Lost</th>
                          <th className="py-2 pr-4 font-medium">Won Value</th>
                          <th className="py-2 font-medium">Avg. Cycle (days)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.salesPerformanceByRep.map((rep) => (
                          <tr
                            key={rep.ownerId ?? 'unassigned'}
                            className="border-(--color-border-default) border-b last:border-0"
                          >
                            <td className="text-(--color-text-primary) py-2 pr-4">
                              {rep.ownerName ?? 'Unassigned'}
                            </td>
                            <td className="text-(--color-text-secondary) py-2 pr-4">
                              {rep.openCount}
                            </td>
                            <td className="text-(--color-text-secondary) py-2 pr-4">
                              {rep.wonCount}
                            </td>
                            <td className="text-(--color-text-secondary) py-2 pr-4">
                              {rep.lostCount}
                            </td>
                            <td className="text-(--color-text-primary) py-2 pr-4">
                              {formatUsd(rep.totalWonValueUsd)}
                            </td>
                            <td className="text-(--color-text-secondary) py-2">
                              {rep.averageSalesCycleDays ?? '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Lost Reasons</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-(--color-border-default) text-caption text-(--color-text-secondary) border-b">
                          <th className="py-2 pr-4 font-medium">Reason</th>
                          <th className="py-2 font-medium">Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.lostReasonsBreakdown.map((reason) => (
                          <tr
                            key={reason.lostReasonId}
                            className="border-(--color-border-default) border-b last:border-0"
                          >
                            <td className="text-(--color-text-primary) py-2 pr-4">
                              {reason.lostReasonLabel}
                            </td>
                            <td className="text-(--color-text-secondary) py-2">{reason.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Conversion &amp; Win Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-(--color-text-secondary) text-sm">
                    Conversion Rate: {formatPercent(data.conversionRatePercent)}
                  </p>
                  <p className="text-(--color-text-secondary) text-sm">
                    Win Rate: {formatPercent(data.winRatePercent)}
                  </p>
                  <p className="text-(--color-text-secondary) text-sm">
                    Average Sales Cycle:{' '}
                    {data.averageSalesCycleDays === null
                      ? '—'
                      : `${data.averageSalesCycleDays} days`}
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </PermissionGate>
      </div>
    </CrmViewGate>
  );
}
