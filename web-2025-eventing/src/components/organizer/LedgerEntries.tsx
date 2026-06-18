'use client';

import React from 'react';
import { Receipt } from 'lucide-react';
import { formatPrice, formatShortDate } from '@/lib/constants';
import type { LedgerEntry } from '@/types';

interface LedgerEntriesProps {
  entries: LedgerEntry[];
}

export function LedgerEntries({ entries }: LedgerEntriesProps) {
  return (
    <div className="aura-card p-5">
      <div className="flex items-center gap-2 mb-5">
        <Receipt className="size-4 text-[var(--primary-dark)]" />
        <h3 className="text-base font-bold text-[var(--text-primary)]">Lịch sử giao dịch</h3>
      </div>

      <div className="space-y-3">
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="p-3.5 rounded-xl bg-[var(--background)] border border-[var(--surface-border)] hover:border-[var(--primary-dark)]/15 transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)] line-clamp-1">
                  {entry.eventName}
                </p>
                <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                  {entry.orderId} · {formatShortDate(entry.date)}
                </p>
              </div>
              <span className="text-sm font-bold text-[var(--success)]">
                +{formatPrice(entry.net)}
              </span>
            </div>

            <div className="flex items-center gap-4 text-[11px] text-[var(--text-muted)]">
              <span>Gộp: {formatPrice(entry.gross)}</span>
              <span>Phí: -{formatPrice(entry.fee)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
