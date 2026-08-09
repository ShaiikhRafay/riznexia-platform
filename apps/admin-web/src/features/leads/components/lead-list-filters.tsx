'use client';

import type { PipelineStage } from '@riznexia/shared-types';
import { Input } from '@riznexia/ui';
import { Search } from 'lucide-react';
import { LEAD_STAGE_OPTIONS } from '../lead-stage';

export interface LeadListFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  stage: PipelineStage | 'all';
  onStageChange: (value: PipelineStage | 'all') => void;
  tag: string;
  onTagChange: (value: string) => void;
  assignedToMe: boolean;
  onAssignedToMeChange: (value: boolean) => void;
}

// Lead List Filters (F4): drives `GET /leads`'s real server-side query
// params directly (`stage`, `tag`, `assignedTo`, `q`) — deliberately NOT
// the shared DataTable's own built-in global-filter/column-filter UI,
// since those only filter the currently-loaded page (see DECISIONS.md):
// with server-side cursor pagination, only 25 leads are ever in memory at
// once, so a client-side filter would silently hide matches on other
// pages rather than searching the whole list. "Assigned to me" is the one
// assigned-user filter the backend can actually support without a
// team-member list endpoint (DECISIONS.md) — there is no "Unassigned"
// option, since `assignedTo` requires a UUID server-side.
export function LeadListFilters({
  search,
  onSearchChange,
  stage,
  onStageChange,
  tag,
  onTagChange,
  assignedToMe,
  onAssignedToMeChange,
}: LeadListFiltersProps) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="relative">
        <Search
          className="text-(--color-text-secondary) pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search by business name…"
          aria-label="Search leads"
          className="w-64 pl-8"
        />
      </div>

      <label className="text-(--color-text-secondary) flex flex-col gap-1 text-xs">
        Stage
        <select
          value={stage}
          onChange={(event) => onStageChange(event.target.value as PipelineStage | 'all')}
          aria-label="Filter by stage"
          className="border-(--color-border-default) bg-(--color-bg-canvas) text-(--color-text-primary) focus-visible:ring-(--color-accent) flex h-9 rounded-md border px-3 text-sm focus-visible:outline-none focus-visible:ring-2"
        >
          <option value="all">All stages</option>
          {LEAD_STAGE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="text-(--color-text-secondary) flex flex-col gap-1 text-xs">
        Tag
        <Input
          value={tag}
          onChange={(event) => onTagChange(event.target.value)}
          placeholder="e.g. vip"
          aria-label="Filter by tag"
          className="w-36"
        />
      </label>

      <label className="text-(--color-text-primary) flex h-9 items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={assignedToMe}
          onChange={(event) => onAssignedToMeChange(event.target.checked)}
          className="border-(--color-border-default) h-4 w-4 rounded"
        />
        Assigned to me
      </label>
    </div>
  );
}
