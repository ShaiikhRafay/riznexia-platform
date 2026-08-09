'use client';

import { Card, CardContent, CardHeader, CardTitle, ErrorState, Skeleton } from '@riznexia/ui';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { PermissionGate } from '@/src/components/auth/permission-gate';
import { useCrmDashboard } from '@/src/features/dashboard/api/use-crm-dashboard';
import { RefreshIntervalProvider } from '@/src/features/dashboard/refresh-interval';
import { useUpcomingTasks } from '../api/use-upcoming-tasks';
import { formatInteger, formatPercent, formatUsd } from '../format';
import { CrmViewGate } from './crm-view-gate';

// CRM Dashboard (F10): "Display exactly what the backend provides... Do
// not calculate business metrics on the frontend." Reuses F2's
// `useCrmDashboard()` directly rather than re-implementing the fetch
// (same `GET /crm/dashboard` endpoint, same query key — no duplicate
// request). "Assigned Leads" has no dedicated field on `DashboardStats`;
// resolved as `salesPerformanceByRep`'s open/won/lost counts per rep — a
// real, already-returned breakdown of leads by assignee, not an invented
// field (DECISIONS.md D-179). "Upcoming Tasks" is a separate real fetch
// (`useUpcomingTasks`), since `DashboardStats` has no tasks field at all.
//
// `useCrmDashboard()` internally calls `useQueryRefetchInterval()`, which
// requires a `<RefreshIntervalProvider>` ancestor — F2's own `/` page
// mounts one around itself (`dashboard-home.tsx`), but this route is a
// different page entirely, so it needs its own instance too (bug found
// during dev-auth verification: reusing the hook without also reusing its
// required provider crashed this page with "useRefreshInterval must be
// used within a <RefreshIntervalProvider>").
export function CrmDashboardPage() {
  return (
    <RefreshIntervalProvider>
      <CrmDashboardPageContent />
    </RefreshIntervalProvider>
  );
}

function CrmDashboardPageContent() {
  const { data, isLoading, error, refetch } = useCrmDashboard();
  const upcomingTasks = useUpcomingTasks();

  return (
    <CrmViewGate>
      <div className="flex flex-col gap-6">
        <h1 className="text-h1 text-(--color-text-primary) font-semibold">CRM Dashboard</h1>

        <PermissionOrError>
          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Skeleton className="h-48 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : error ? (
            <ErrorState error={error} onRetry={() => void refetch()} />
          ) : data ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Pipeline Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-h1 text-(--color-text-primary) font-semibold">
                    {formatUsd(data.totalPipelineValueUsd)}
                  </p>
                  <ul className="flex flex-col gap-1 text-sm">
                    {data.pipelineValueByStage.map((stage) => (
                      <li key={stage.stageId} className="flex items-center justify-between">
                        <span className="text-(--color-text-secondary)">{stage.stageName}</span>
                        <span className="text-(--color-text-primary)">
                          {formatUsd(stage.totalValueUsd)} ({stage.leadCount})
                        </span>
                      </li>
                    ))}
                    {data.pipelineValueByStage.length === 0 ? (
                      <li className="text-(--color-text-secondary)">No open pipeline value yet.</li>
                    ) : null}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Conversion &amp; Win Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-6">
                    <div>
                      <p className="text-caption text-(--color-text-secondary)">Conversion Rate</p>
                      <p className="text-h1 text-(--color-text-primary) font-semibold">
                        {formatPercent(data.conversionRatePercent)}
                      </p>
                    </div>
                    <div>
                      <p className="text-caption text-(--color-text-secondary)">Win Rate</p>
                      <p className="text-h1 text-(--color-text-primary) font-semibold">
                        {formatPercent(data.winRatePercent)}
                      </p>
                    </div>
                  </div>
                  <p className="text-(--color-text-secondary) text-sm">
                    Average Sales Cycle:{' '}
                    {data.averageSalesCycleDays === null
                      ? '—'
                      : `${formatInteger(data.averageSalesCycleDays)} days`}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Sales Performance (Assigned Leads)</CardTitle>
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
                          <th className="py-2 font-medium">Won Value</th>
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
                            <td className="text-(--color-text-primary) py-2">
                              {formatUsd(rep.totalWonValueUsd)}
                            </td>
                          </tr>
                        ))}
                        {data.salesPerformanceByRep.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="text-(--color-text-secondary) py-2">
                              No sales performance data yet.
                            </td>
                          </tr>
                        ) : null}
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
                  <ul className="flex flex-col gap-1 text-sm">
                    {data.lostReasonsBreakdown.map((reason) => (
                      <li key={reason.lostReasonId} className="flex items-center justify-between">
                        <span className="text-(--color-text-secondary)">
                          {reason.lostReasonLabel}
                        </span>
                        <span className="text-(--color-text-primary)">{reason.count}</span>
                      </li>
                    ))}
                    {data.lostReasonsBreakdown.length === 0 ? (
                      <li className="text-(--color-text-secondary)">No lost leads yet.</li>
                    ) : null}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Upcoming Tasks</CardTitle>
                </CardHeader>
                <CardContent>
                  {upcomingTasks.isLoading ? (
                    <Skeleton className="h-24 w-full" />
                  ) : upcomingTasks.error ? (
                    <ErrorState
                      error={upcomingTasks.error}
                      onRetry={() => void upcomingTasks.refetch()}
                    />
                  ) : (
                    <ul className="flex flex-col gap-2 text-sm">
                      {(upcomingTasks.data?.items ?? []).map((task) => (
                        <li key={task.id} className="flex items-center justify-between">
                          <Link
                            href="/crm/tasks"
                            className="text-(--color-text-primary) hover:underline"
                          >
                            {task.title}
                          </Link>
                          <span className="text-(--color-text-secondary)">
                            {new Date(task.dueDate).toLocaleDateString()}
                          </span>
                        </li>
                      ))}
                      {(upcomingTasks.data?.items.length ?? 0) === 0 ? (
                        <li className="text-(--color-text-secondary)">
                          No upcoming tasks in the next 7 days.
                        </li>
                      ) : null}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
          ) : null}
        </PermissionOrError>
      </div>
    </CrmViewGate>
  );
}

// `GET /crm/dashboard` requires `crm:report` specifically, a stricter
// permission than `crm:view` (which merely reaches this page). A
// `sales_executive` holds `crm:view`/`crm:manage` but not `crm:report` —
// they should see this exact page render a clear message, not a raw 403
// error from a request that never should have fired.
function PermissionOrError({ children }: { children: ReactNode }) {
  return (
    <PermissionGate
      permission="crm:report"
      fallback={
        <p className="text-(--color-text-secondary) text-sm">
          You don&rsquo;t have permission to view CRM reports.
        </p>
      }
    >
      {children}
    </PermissionGate>
  );
}
