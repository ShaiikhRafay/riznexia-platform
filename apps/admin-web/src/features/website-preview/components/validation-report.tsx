'use client';

import {
  Button,
  ErrorState,
  Skeleton,
  StatusBadge,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@riznexia/ui';
import {
  RULE_CATEGORIES,
  type RuleCategory,
  type ValidationRuleResult,
} from '@riznexia/shared-types';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { PermissionGate } from '@/src/components/auth/permission-gate';
import { ApiError } from '@/src/lib/api-client';
import { useValidationReport } from '../api/use-validation-report';

export interface ValidationReportProps {
  leadId: string;
}

const CATEGORY_LABELS: Record<RuleCategory, string> = {
  structural: 'Structural',
  content: 'Content',
  seo: 'SEO',
  accessibility: 'Accessibility',
  performance: 'Performance',
};

// Validation Report (F9): "Passed Checks, Failed Checks, Warnings,
// Deductions, Validation Messages", "Never calculate scores on the
// frontend. Never invent validation results." `PreviewReport` carries
// exactly one field for rule data — a flat `rules: ValidationRuleResult[]`
// mixing all five categories, each with its own `ruleCategory` and
// `status` (`pass | warning | error`) — there is no server-side grouping
// by category or status. Grouping/tallying that already-returned data by
// its own real fields is a pure display tally, not a score calculation —
// the same category of client-side arithmetic as F8's D-168 Generated
// Files Summary (`.length` over a real array), not a new computed value.
// "Deductions" is omitted here — `PreviewReport`/`ValidationRuleResult`
// has no such field; deductions only exist on Publish Readiness's
// `ScoreBreakdown`, which this module's own governing rule ("never invent
// data") forecloses fabricating here. See DECISIONS.md D-173.
export function ValidationReport({ leadId }: ValidationReportProps) {
  const { data: report, isLoading, error, refetch } = useValidationReport(leadId);

  return (
    <div className="flex flex-col gap-6">
      <Button variant="ghost" size="sm" asChild className="self-start">
        <Link href={`/website-preview?leadId=${leadId}`}>
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Website Preview
        </Link>
      </Button>
      <h1 className="text-h1 text-(--color-text-primary) font-semibold">Validation Report</h1>

      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : error ? (
        error instanceof ApiError && error.code === 'GENERATED_WEBSITE_NOT_FOUND' ? (
          <p className="text-(--color-text-secondary) text-sm">
            No generated website exists yet for this lead — run Website Generator first.
          </p>
        ) : (
          <ErrorState error={error} onRetry={() => void refetch()} />
        )
      ) : report ? (
        <PermissionGate
          permission="website:preview"
          fallback={
            <p className="text-(--color-text-secondary) text-sm">
              You don&rsquo;t have permission to open the validation report.
            </p>
          }
        >
          <p className="text-(--color-text-secondary) text-xs">
            Validated {new Date(report.validationTimestamp).toLocaleString()} · Validation engine{' '}
            {report.validationVersion}
          </p>
          <Tabs defaultValue={RULE_CATEGORIES[0]}>
            <TabsList>
              {RULE_CATEGORIES.map((category) => (
                <TabsTrigger key={category} value={category}>
                  {CATEGORY_LABELS[category]}
                </TabsTrigger>
              ))}
            </TabsList>
            {RULE_CATEGORIES.map((category) => (
              <TabsContent key={category} value={category}>
                <CategoryRules
                  rules={report.rules.filter((rule) => rule.ruleCategory === category)}
                />
              </TabsContent>
            ))}
          </Tabs>
        </PermissionGate>
      ) : null}
    </div>
  );
}

function CategoryRules({ rules }: { rules: ValidationRuleResult[] }) {
  const passed = rules.filter((rule) => rule.status === 'pass');
  const failed = rules.filter((rule) => rule.status === 'error');
  const warnings = rules.filter((rule) => rule.status === 'warning');

  if (rules.length === 0) {
    return (
      <p className="text-(--color-text-secondary) text-sm">
        No rules were evaluated for this category.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <StatusBadge variant="success" label={`${passed.length} Passed`} />
        <StatusBadge variant="danger" label={`${failed.length} Failed`} />
        <StatusBadge variant="warning" label={`${warnings.length} Warnings`} />
      </div>
      <RuleGroup title="Failed Checks" rules={failed} variant="danger" />
      <RuleGroup title="Warnings" rules={warnings} variant="warning" />
      <RuleGroup title="Passed Checks" rules={passed} variant="success" />
    </div>
  );
}

function RuleGroup({
  title,
  rules,
  variant,
}: {
  title: string;
  rules: ValidationRuleResult[];
  variant: 'success' | 'warning' | 'danger';
}) {
  if (rules.length === 0) {
    return null;
  }
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-(--color-text-primary) text-sm font-semibold">{title}</h2>
      <ul className="flex flex-col gap-2">
        {rules.map((rule) => (
          <li key={rule.ruleId} className="border-(--color-border-default) rounded-lg border p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-(--color-text-primary) text-sm font-medium">
                {rule.ruleName}
              </span>
              <StatusBadge variant={variant} label={rule.severity} />
            </div>
            <p className="text-(--color-text-secondary) text-sm">{rule.message}</p>
            {rule.recommendation ? (
              <p className="text-(--color-text-secondary) text-xs">
                Recommendation: {rule.recommendation}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
