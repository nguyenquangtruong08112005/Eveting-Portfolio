'use client';

import { AlertTriangle } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

interface MockDataBannerProps {
  /** Override the description */
  message?: string;
  className?: string;
}

/**
 * Inline banner that marks a view as backed by mock data (no live API yet).
 * Use on admin views whose endpoints don't exist on the backend yet, so it's
 * never mistaken for live data.
 */
export function MockDataBanner({ message, className }: MockDataBannerProps) {
  const t = useTranslations('common');
  return (
    <div
      role="status"
      className={cn(
        'flex items-start gap-2.5 rounded-xl border border-[var(--warning)]/30 bg-[var(--warning)]/10 px-4 py-3',
        'text-sm text-[var(--warning)]',
        className
      )}
    >
      <AlertTriangle className="size-4 shrink-0 mt-0.5" />
      <span>{message ?? t('mock_data_notice')}</span>
    </div>
  );
}
