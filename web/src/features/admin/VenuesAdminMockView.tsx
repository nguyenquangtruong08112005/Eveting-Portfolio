'use client';

import { MapPin } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/shared/PageHeader';
import { MockDataBanner } from '@/components/shared/MockDataBanner';
import { ADMIN_NAV } from '@/features/admin/nav';

const FIXTURE = [
  { id: '1', name: 'Hanoi Opera House', city: 'Hanoi', owner: 'org-a' },
  { id: '2', name: 'Saigon Exhibition Center', city: 'Ho Chi Minh City', owner: 'org-b' },
  { id: '3', name: 'Da Nang Beach Stage', city: 'Da Nang', owner: 'org-a' },
];

export function VenuesAdminMockView() {
  const t = useTranslations('admin_venues');
  const tCommon = useTranslations('common');

  return (
    <AppShell variant="admin" items={ADMIN_NAV} heading={tCommon('admin_badge')}>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 lg:py-10 w-full space-y-5">
        <PageHeader
          title={t('title')}
          description={t('subtitle')}
          icon={<MapPin className="size-5" />}
        />
        <MockDataBanner message={t('mock_banner')} />
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {FIXTURE.map((v) => (
            <li
              key={v.id}
              className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface)] p-5"
            >
              <p className="text-sm font-bold text-[var(--text-primary)]">{v.name}</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                {v.city} · {t('owner')}: {v.owner}
              </p>
            </li>
          ))}
        </ul>
      </main>
    </AppShell>
  );
}
