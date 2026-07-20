'use client';

import { Users } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/shared/PageHeader';
import { MockDataBanner } from '@/components/shared/MockDataBanner';
import { Badge } from '@/components/ui/badge';
import { ADMIN_NAV } from '@/features/admin/nav';

const FIXTURE = [
  { id: '1', email: 'attendee@example.com', role: 'attendee', status: 'active' },
  { id: '2', email: 'organizer@example.com', role: 'organizer', status: 'active' },
  { id: '3', email: 'admin@example.com', role: 'admin', status: 'active' },
  { id: '4', email: 'pending.org@example.com', role: 'organizer', status: 'pending' },
];

export function UsersMockView() {
  const t = useTranslations('admin_users');
  const tCommon = useTranslations('common');

  return (
    <AppShell variant="admin" items={ADMIN_NAV} heading={tCommon('admin_badge')}>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 lg:py-10 w-full space-y-5">
        <PageHeader
          title={t('title')}
          description={t('subtitle')}
          icon={<Users className="size-5" />}
        />
        <MockDataBanner message={t('mock_banner')} />
        <div className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--surface-border)] text-left text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                <th className="px-4 py-3 font-bold">{t('col_email')}</th>
                <th className="px-4 py-3 font-bold">{t('col_role')}</th>
                <th className="px-4 py-3 font-bold">{t('col_status')}</th>
                <th className="px-4 py-3 font-bold">{t('col_actions')}</th>
              </tr>
            </thead>
            <tbody>
              {FIXTURE.map((u) => (
                <tr key={u.id} className="border-b border-[var(--surface-border)]/60">
                  <td className="px-4 py-3 font-mono text-xs text-[var(--text-primary)]">
                    {u.email}
                  </td>
                  <td className="px-4 py-3">
                    <Badge className="text-[10px] capitalize">{u.role}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--text-secondary)] capitalize">
                    {u.status}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      disabled
                      className="text-[10px] font-bold text-[var(--text-muted)] opacity-50 cursor-not-allowed"
                    >
                      {t('action_ban_disabled')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </AppShell>
  );
}
