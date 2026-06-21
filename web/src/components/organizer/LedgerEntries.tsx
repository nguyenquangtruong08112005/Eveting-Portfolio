'use client';

import React from 'react';
import { Receipt } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { formatPrice, formatShortDate } from '@/lib/constants';
import type { LedgerEntry } from '@/types';

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
    <div className="bg-[#1E212B] border border-white/5 p-5 rounded-2xl shadow-xl flex flex-col h-full">
      <div className="flex items-center gap-2 mb-5">
        <Receipt className="size-4.5 text-[var(--primary)]" />
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">{t('title')}</h3>
      </div>

      <div className="space-y-3 overflow-y-auto max-h-[400px] pr-1.5 scrollbar-hide flex-1">
        {entries.length === 0 ? (
          <div className="text-center py-10 text-zinc-500 text-xs italic">{t('empty')}</div>
        ) : (
          entries.map((entry) => (
            <div
              key={entry.id}
              className="p-4 rounded-xl bg-[#12141A]/60 border border-white/5 hover:border-[var(--primary)]/10 transition-colors flex flex-col gap-2"
            >
              <div className="flex items-start justify-between">
                <div className="max-w-[70%]">
                  <p className="text-xs font-bold text-white line-clamp-1 leading-snug">
                    {entry.eventName}
                  </p>
                  <p className="text-[10px] text-zinc-500 mt-1">
                    {t('order_id')} <span className="font-mono text-zinc-400">{entry.orderId}</span>
                  </p>
                  <p className="text-[9px] text-zinc-500 mt-0.5">
                    {mounted ? formatShortDate(entry.date) : '...'}
                  </p>
                </div>
                <span className="text-xs font-bold text-[#2dc275]">
                  +{formatPrice(entry.net)}
                </span>
              </div>

              <div className="border-t border-white/5 pt-2 flex items-center justify-between text-[9px] text-zinc-400">
                <span>{t('gross')} <span className="text-zinc-300 font-semibold">{formatPrice(entry.gross)}</span></span>
                <span>{t('fee')} <span className="text-red-400 font-semibold">-{formatPrice(entry.fee)}</span></span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
