'use client';

import type { LucideIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState } from '@/components/shared/EmptyState';
import { ORG_NAV } from '@/features/organizer/nav';

interface OrganizerSectionPlaceholderProps {
  titleKey: string;
  descriptionKey: string;
  icon: LucideIcon;
}

/**
 * Temporary shell for Phase 3 routes until full views ship (B–E).
 */
export function OrganizerSectionPlaceholder({
  titleKey,
  descriptionKey,
  icon: Icon,
}: OrganizerSectionPlaceholderProps) {
  const t = useTranslations('organizer');
  const tCommon = useTranslations('common');

  return (
    <AppShell variant="organizer" items={ORG_NAV} heading={tCommon('org_badge')}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 lg:py-10 w-full">
        <PageHeader
          title={t(titleKey)}
          description={t(descriptionKey)}
          icon={<Icon className="size-5" />}
        />
        <EmptyState
          icon={Icon}
          title={t('section_coming_title')}
          description={t('section_coming_desc')}
          className="mt-4"
        />
      </div>
    </AppShell>
  );
}
