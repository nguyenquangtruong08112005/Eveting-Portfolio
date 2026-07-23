'use client';

import React from 'react';
import { Receipt } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { formatPrice, formatShortDate } from '@/lib/constants';
import type { LedgerEntry } from '@/types';
import { EmptyState } from '@/components/shared/EmptyState';

interface LedgerEntriesProps {
  entries: LedgerEntry[];
}

export function LedgerEntries({ entries }: LedgerEntriesProps) {
  const t = useTranslations('ledger');
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="bg-[var(--surface)] border border-[var(--surface-border)] p-5 rounded-2xl flex flex-col h-full">
      <div className="flex items-center gap-2 mb-5">
        <Receipt className="size-4.5 text-[var(--primary)]" />
        <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider">
          {t('title')}
        </h3>
      </div>

      <div className="space-y-3 overflow-y-auto max-h-[400px] pr-1.5 scrollbar-hide flex-1">
        {entries.length === 0 ? (
          <EmptyState title={t('empty')} className="border-none bg-transparent py-8" />
        ) : (
          entries.map((entry) => (
            <div
              key={entry.id}
              className="p-4 rounded-xl bg-[var(--background)]/60 border border-[var(--surface-border)] hover:border-[var(--primary)]/20 transition-colors flex flex-col gap-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-[var(--text-primary)] line-clamp-1 leading-snug">
                    {entry.eventName}
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-1">
                    {t('order_id')}{' '}
                    <span className="font-mono text-[var(--text-secondary)]">{entry.orderId}</span>
                  </p>
                  <p className="text-[9px] text-[var(--text-muted)] mt-0.5">
                    {mounted ? formatShortDate(entry.date) : '...'}
                  </p>
                </div>
                <span className="text-xs font-bold text-[var(--success)] whitespace-nowrap">
                  +{formatPrice(entry.net)}
                </span>
              </div>

              <div className="border-t border-[var(--surface-border)] pt-2 flex items-center justify-between text-[9px] text-[var(--text-muted)]">
                <span>
                  {t('gross')}{' '}
                  <span className="text-[var(--text-secondary)] font-semibold">
                    {formatPrice(entry.gross)}
                  </span>
                </span>
                <span>
                  {t('fee')}{' '}
                  <span className="text-[var(--error)] font-semibold">
                    -{formatPrice(entry.fee)}
                  </span>
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
