'use client';

import { DollarSign, TrendingUp, Percent, Wallet } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { formatPrice } from '@/lib/constants';
import type { OrganizerStats } from '@/types';

interface StatsGridProps {
  stats: OrganizerStats;
}

const statConfig = [
  { key: 'totalSales' as const, labelKey: 'total_sold', icon: TrendingUp, color: '#FF8F66', isCurrency: false },
  { key: 'grossRevenue' as const, labelKey: 'gross_revenue', icon: DollarSign, color: '#2dc275', isCurrency: true },
  { key: 'platformFees' as const, labelKey: 'platform_fee', icon: Percent, color: '#fcc025', isCurrency: true },
  { key: 'netRevenue' as const, labelKey: 'net_revenue', icon: Wallet, color: '#3b82f6', isCurrency: true },
];

export function StatsGrid({ stats }: StatsGridProps) {
  const t = useTranslations('stats');

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {statConfig.map(({ key, labelKey, icon: Icon, color, isCurrency }) => (
        <div
          key={key}
          className="bg-[#1E212B] border border-white/5 p-5 rounded-2xl flex items-start gap-4 hover:border-white/10 transition-all shadow-lg"
        >
          <div
            className="size-10 rounded-xl flex items-center justify-center shrink-0 shadow-inner"
            style={{ background: `${color}15` }}
          >
            <Icon className="size-5" style={{ color }} />
          </div>
          <div>
            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider mb-1">
              {t(labelKey)}
            </p>
            <p className="text-xl font-black text-white" style={{ textShadow: `0 0 10px ${color}10` }}>
              {isCurrency ? formatPrice(stats[key]) : stats[key].toLocaleString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
