'use client';

import React from 'react';
import { Receipt, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface LedgerEntry {
  id: string;
  orderId: string;
  eventName: string;
  gross: number;
  fee: number;
  net: number;
  date: number;
}

interface LedgerEntriesProps {
  entries: LedgerEntry[];
}

export function LedgerEntries({ entries }: LedgerEntriesProps) {
  return (
    <Card className="premium-card p-6 rounded-2xl flex flex-col justify-between border-none ring-0">
      <CardContent className="p-0 text-left">
        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-1.5">
          <Receipt className="size-5 text-purple-400" />
          Ledger Payout Logs
        </h3>

        <div className="space-y-4 max-h-[300px] overflow-y-auto pr-1">
          {entries.map((led) => (
            <div
              key={led.id}
              className="p-3.5 border border-zinc-850 bg-zinc-900/30 rounded-xl text-xs flex flex-col gap-2"
            >
              <div className="flex justify-between items-start">
                <span className="font-bold text-white line-clamp-1">{led.eventName}</span>
                <span className="text-[10px] text-zinc-500 font-mono uppercase">{led.orderId}</span>
              </div>

              <div className="flex justify-between items-center text-zinc-400">
                <span>Gross subtotal:</span>
                <span className="font-semibold">{led.gross.toLocaleString('vi-VN')} ₫</span>
              </div>

              <div className="flex justify-between items-center text-red-400">
                <span>Platform fee (5%):</span>
                <span>-{led.fee.toLocaleString('vi-VN')} ₫</span>
              </div>

              <Separator className="bg-zinc-800/80 my-1" />

              <div className="flex justify-between items-center text-green-400 font-bold">
                <span>Net Credit:</span>
                <span>+{led.net.toLocaleString('vi-VN')} ₫</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      <Button
        variant="outline"
        className="w-full mt-6 py-5 rounded-xl border border-zinc-800 hover:bg-zinc-900 transition-all font-semibold text-xs tracking-wider uppercase text-zinc-300 flex items-center justify-center gap-1.5 cursor-pointer btn-tactile"
      >
        Withdraw All Funds
        <ArrowUpRight className="size-4" />
      </Button>
    </Card>
  );
}
