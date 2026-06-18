'use client';

import React from 'react';
import { DollarSign, Percent, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface Stats {
  totalSales: number;
  grossRevenue: number;
  platformFees: number;
  netRevenue: number;
}

interface StatsGridProps {
  stats: Stats;
}

export function StatsGrid({ stats }: StatsGridProps) {
  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
      <Card className="premium-card p-6 rounded-2xl border-none ring-0">
        <CardContent className="p-0 text-left">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Tickets Sold</span>
            <TrendingUp className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white mb-1">{stats.totalSales}</div>
          <span className="text-[10px] text-zinc-500">+12% from last week</span>
        </CardContent>
      </Card>

      <Card className="premium-card p-6 rounded-2xl border-none ring-0">
        <CardContent className="p-0 text-left">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Gross Revenue</span>
            <DollarSign className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-cyan-400 mb-1">
            {stats.grossRevenue.toLocaleString('vi-VN')} ₫
          </div>
          <span className="text-[10px] text-zinc-500">Platform rate configured: 5%</span>
        </CardContent>
      </Card>

      <Card className="premium-card p-6 rounded-2xl border-none ring-0">
        <CardContent className="p-0 text-left">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Platform Fees</span>
            <Percent className="h-4 w-4 text-red-400" />
          </div>
          <div className="text-2xl font-bold text-red-400 mb-1">
            {stats.platformFees.toLocaleString('vi-VN')} ₫
          </div>
          <span className="text-[10px] text-zinc-500">Calculated dynamic ledger deduction</span>
        </CardContent>
      </Card>

      <Card className="premium-card p-6 rounded-2xl border-none ring-0">
        <CardContent className="p-0 text-left">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Net Payout Balance</span>
            <DollarSign className="h-4 w-4 text-green-400" />
          </div>
          <div className="text-2xl font-bold text-green-400 mb-1">
            {stats.netRevenue.toLocaleString('vi-VN')} ₫
          </div>
          <span className="text-[10px] text-zinc-500">Available for instant withdrawal</span>
        </CardContent>
      </Card>
    </section>
  );
}
