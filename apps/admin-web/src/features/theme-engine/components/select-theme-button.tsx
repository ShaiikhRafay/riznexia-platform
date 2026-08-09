'use client';

import { Button, toast } from '@riznexia/ui';
import { PermissionGate } from '@/src/components/auth/permission-gate';
import { ApiError } from '@/src/lib/api-client';
import { useSelectTheme } from '../api/use-select-theme';

export interface SelectThemeButtonProps {
  leadId: string;
  /** Whether a theme is already selected for this lead — switches the label from "Run" to "Re-run"; the request itself is identical either way (see DECISIONS.md). */
  hasExistingTheme: boolean;
}

// Run/Re-run Theme Selection (F7): one button, one mutation — gated on
// `theme:select` (hidden, not disabled, when missing). Unlike F6's
// RunAnalysisButton, this never infers or announces a "cache status" —
// the founder's F7 brief doesn't ask for one, and doing so anyway would
// invent a feature nobody requested for this module.
export function SelectThemeButton({ leadId, hasExistingTheme }: SelectThemeButtonProps) {
  const selectTheme = useSelectTheme(leadId);

  async function handleClick() {
    try {
      const config = await selectTheme.mutateAsync();
      toast.success(`Theme selected: ${config.themeName}`);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : 'Could not select a theme.';
      toast.error(message);
    }
  }

  return (
    <PermissionGate permission="theme:select">
      <Button onClick={() => void handleClick()} loading={selectTheme.isPending}>
        {hasExistingTheme ? 'Re-run Theme Selection' : 'Run Theme Selection'}
      </Button>
    </PermissionGate>
  );
}
