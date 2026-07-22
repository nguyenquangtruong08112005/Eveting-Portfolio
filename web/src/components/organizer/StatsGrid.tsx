'use client';

import { DollarSign, TrendingUp, Percent, Wallet } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { formatMoney } from '@/lib/constants';
import type { OrganizerStats } from '@/types';
import { cn } from '@/lib/utils';

interface StatsGridProps {
  stats: OrganizerStats;
}

// Each stat maps to a semantic token so the icon color adapts to theme.
const statConfig = [
  { key: 'totalSales' as const, labelKey: 'total_sold', icon: TrendingUp, token: '--primary', isCurrency: false },
  { key: 'grossRevenue' as const, labelKey: 'gross_revenue', icon: DollarSign, token: '--success', isCurrency: true },
  { key: 'platformFees' as const, labelKey: 'platform_fee', icon: Percent, token: '--warning', isCurrency: true },
  { key: 'netRevenue' as const, labelKey: 'net_revenue', icon: Wallet, token: '--accent-brand', isCurrency: true },
];

export function StatsGrid({ stats }: StatsGridProps) {
  const t = useTranslations('stats');
  const safe = {
    totalSales: Number(stats?.totalSales ?? 0) || 0,
    grossRevenue: Number(stats?.grossRevenue ?? 0) || 0,
    platformFees: Number(stats?.platformFees ?? 0) || 0,
    netRevenue: Number(stats?.netRevenue ?? 0) || 0,
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {statConfig.map(({ key, labelKey, icon: Icon, token, isCurrency }) => {
        const value = safe[key];
        return (
          <div
            key={key}
            className="bg-[var(--surface)] border border-[var(--surface-border)] p-5 rounded-2xl flex items-start gap-4 hover:border-[var(--primary)]/20 transition-all"
          >
            <div
              className="size-10 rounded-xl flex items-center justify-center shrink-0"
              style={{
                backgroundColor: `color-mix(in srgb, var(${token}) 12%, transparent)`,
              }}
            >
              <Icon className="size-5" style={{ color: `var(${token})` }} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider mb-1">
                {t(labelKey)}
              </p>
              <p
                className={cn('text-xl font-black truncate')}
                style={{ color: `var(${token})` }}
                title={isCurrency ? formatMoney(value) : String(value)}
              >
                {isCurrency ? formatMoney(value) : value.toLocaleString()}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
