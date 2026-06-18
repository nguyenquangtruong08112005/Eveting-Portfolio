'use client';

import React from 'react';
import { DollarSign, TrendingUp, Percent, Wallet } from 'lucide-react';
import { formatPrice } from '@/lib/constants';
import type { OrganizerStats } from '@/types';

interface StatsGridProps {
  stats: OrganizerStats;
}

const statConfig = [
  { key: 'totalSales' as const, label: 'Tổng vé bán', icon: TrendingUp, color: 'var(--primary-dark)', isCurrency: false },
  { key: 'grossRevenue' as const, label: 'Doanh thu gộp', icon: DollarSign, color: 'var(--secondary-green)', isCurrency: true },
  { key: 'platformFees' as const, label: 'Phí nền tảng', icon: Percent, color: 'var(--secondary-yellow)', isCurrency: true },
  { key: 'netRevenue' as const, label: 'Doanh thu ròng', icon: Wallet, color: 'var(--primary-dark)', isCurrency: true },
];

export function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {statConfig.map(({ key, label, icon: Icon, color, isCurrency }) => (
        <div
          key={key}
          className="aura-card p-5 flex items-start gap-4"
        >
          <div
            className="size-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: `color-mix(in srgb, ${color} 12%, transparent)` }}
          >
            <Icon className="size-5" style={{ color }} />
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)] font-medium uppercase tracking-wider mb-1">
              {label}
            </p>
            <p className="text-xl font-bold text-[var(--text-primary)]">
              {isCurrency ? formatPrice(stats[key]) : stats[key].toLocaleString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
