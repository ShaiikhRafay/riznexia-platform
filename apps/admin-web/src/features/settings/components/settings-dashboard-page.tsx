'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@riznexia/ui';
import Link from 'next/link';
import { PermissionGate } from '@/src/components/auth/permission-gate';
import { useCrmSettings } from '../api/use-crm-settings';
import { SettingsAccessGate } from './settings-access-gate';
import { SettingsSubNav } from './settings-sub-nav';

const SECTIONS = [
  {
    href: '/settings/company',
    title: 'Company',
    description: 'Currency, timezone, and business hours (M10 CRM Settings).',
  },
  {
    href: '/settings/ai',
    title: 'AI',
    description: 'AI usage stats and budget ceiling (M12 Analytics).',
  },
  {
    href: '/settings/api-keys',
    title: 'API Keys',
    description: 'How provider keys are configured.',
  },
  { href: '/settings/prompts', title: 'Prompts', description: 'AI prompt versioning (M6).' },
  {
    href: '/settings/theme-defaults',
    title: 'Theme Defaults',
    description: 'Theme usage across generated websites (M7).',
  },
  {
    href: '/settings/deployment',
    title: 'Deployment',
    description: 'Deployment provider and delivery stats (M11).',
  },
  {
    href: '/settings/cost-budget',
    title: 'Cost & Budget',
    description: 'Monthly AI spend vs. ceiling (M12).',
  },
  {
    href: '/settings/analytics',
    title: 'Analytics',
    description: 'Reporting and export configuration (M12).',
  },
  {
    href: '/settings/system',
    title: 'System Information',
    description: 'API reachability and version info.',
  },
  {
    href: '/settings/audit',
    title: 'Audit History',
    description: 'Full audit log (reuses F12 Audit Logs).',
  },
] as const;

// Settings Dashboard (F13): a plain navigation hub, same shape as F12's own
// Analytics Dashboard "More" links section — no fabricated summary metrics
// beyond the one real, cheap value (Company currency/timezone, already
// fetched by the Company Settings page's own hook) called out below.
export function SettingsDashboardPage() {
  return (
    <SettingsAccessGate>
      <div className="flex flex-col gap-6">
        <SettingsSubNav />
        <h1 className="text-h1 text-(--color-text-primary) font-semibold">Settings</h1>

        <PermissionGate permission="crm:view">
          <QuickGlanceCard />
        </PermissionGate>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SECTIONS.map((section) => (
            <Link key={section.href} href={section.href}>
              <Card className="hover:border-(--color-accent) h-full transition-colors">
                <CardHeader>
                  <CardTitle className="text-h2 text-(--color-text-primary) font-semibold">
                    {section.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-(--color-text-secondary) text-sm">
                  {section.description}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </SettingsAccessGate>
  );
}

function QuickGlanceCard() {
  const { data } = useCrmSettings();
  if (!data) {
    return null;
  }
  return (
    <Card>
      <CardContent className="flex flex-wrap gap-6 text-sm">
        <span className="text-(--color-text-secondary)">
          Currency: <span className="text-(--color-text-primary) font-medium">{data.currency}</span>
        </span>
        <span className="text-(--color-text-secondary)">
          Timezone: <span className="text-(--color-text-primary) font-medium">{data.timezone}</span>
        </span>
      </CardContent>
    </Card>
  );
}
