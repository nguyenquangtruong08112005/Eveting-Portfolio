'use client';

import Link from 'next/link';
import { Compass } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function NotFound() {
  const t = useTranslations('common');

  return (
    <div className="flex-1 flex flex-col bg-[var(--background)] min-h-screen items-center justify-center p-6">
      <div className="max-w-md glass-card rounded-2xl p-8 text-center">
        <div className="size-12 rounded-full bg-[var(--primary)]/15 flex items-center justify-center mx-auto mb-4">
          <Compass className="size-6 text-[var(--primary)]" />
        </div>
        <h2 className="text-[var(--text-primary)] text-lg font-bold mb-2">
          {t('not_found_title')}
        </h2>
        <p className="text-[var(--text-secondary)] text-sm mb-6">
          {t('not_found_desc')}
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-2.5 rounded-xl btn-primary-gradient text-xs font-bold text-[var(--on-primary)] border-none btn-tactile"
        >
          {t('back_home')}
        </Link>
      </div>
    </div>
  );
}
