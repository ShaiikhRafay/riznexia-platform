'use client';

import { Button, StatusBadge } from '@riznexia/ui';
import Link from 'next/link';
import { PermissionGate } from '@/src/components/auth/permission-gate';
import type { Permission } from '@/src/lib/permissions';

export interface PipelineStageCardProps {
  title: string;
  description: string;
  exists: boolean;
  versionLabel?: string;
  viewHref?: string;
  onGenerate: () => void;
  isGenerating: boolean;
  permission: Permission;
  /** When set, the Generate action is replaced with this explanation — the real backend precondition for this stage isn't met yet (e.g. "Requires Layout first"). */
  blockedReason?: string;
}

// Website Generator Dashboard (F8, founder-approved resolution): the
// backend has a hard, unbreakable Layout→Component→Content→Website
// dependency chain with no auto-orchestration anywhere (verified against
// all four *.service.ts files) — each stage's own POST throws a real
// NotFound exception if its immediate predecessor doesn't exist yet. This
// card is reused four times (Layout/Component/Content/Website), each
// gated by its own real backend permission
// (layout:generate/component:generate/content:bind/website:assemble),
// rather than one "Generate Website" button scoped to `website:assemble`
// alone that would 404 on almost every lead's first pass through the
// pipeline. See DECISIONS.md for this module.
export function PipelineStageCard({
  title,
  description,
  exists,
  versionLabel,
  viewHref,
  onGenerate,
  isGenerating,
  permission,
  blockedReason,
}: PipelineStageCardProps) {
  return (
    <div className="border-(--color-border-default) bg-(--color-bg-surface) flex items-center justify-between gap-4 rounded-lg border p-4">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h3 className="text-(--color-text-primary) text-sm font-semibold">{title}</h3>
          <StatusBadge
            variant={exists ? 'success' : 'neutral'}
            label={exists ? 'Generated' : 'Not generated'}
          />
        </div>
        <p className="text-(--color-text-secondary) text-xs">{description}</p>
        {exists && versionLabel ? (
          <p className="text-(--color-text-secondary) text-xs">{versionLabel}</p>
        ) : null}
        {exists && viewHref ? (
          <Link
            href={viewHref}
            className="text-(--color-accent) text-xs font-medium hover:underline"
          >
            View
          </Link>
        ) : null}
      </div>
      {blockedReason ? (
        <p className="text-(--color-text-secondary) max-w-[16rem] text-right text-xs">
          {blockedReason}
        </p>
      ) : (
        <PermissionGate permission={permission}>
          <Button
            size="sm"
            variant={exists ? 'secondary' : 'primary'}
            onClick={onGenerate}
            loading={isGenerating}
          >
            {exists ? `Re-generate ${title}` : `Generate ${title}`}
          </Button>
        </PermissionGate>
      )}
    </div>
  );
}
