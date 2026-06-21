'use client';

import React from 'react';
import { DollarSign, TrendingUp, Percent, Wallet } from 'lucide-react';
import { formatPrice } from '@/lib/constants';
import type { OrganizerStats } from '@/types';

interface StatsGridProps {
  stats: OrganizerStats;
}

const statConfig = [
  { key: 'totalSales' as const, label: 'Tổng vé bán', icon: TrendingUp, color: '#FF8F66', isCurrency: false },
  { key: 'grossRevenue' as const, label: 'Doanh thu gộp', icon: DollarSign, color: '#2dc275', isCurrency: true },
  { key: 'platformFees' as const, label: 'Phí nền tảng', icon: Percent, color: '#fcc025', isCurrency: true },
  { key: 'netRevenue' as const, label: 'Doanh thu ròng', icon: Wallet, color: '#3b82f6', isCurrency: true },
];

export function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {statConfig.map(({ key, label, icon: Icon, color, isCurrency }) => (
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
              {label}
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
