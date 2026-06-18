'use client';

import React from 'react';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface OrganizerEvent {
  id: string;
  name: string;
  status: string;
  sold: number;
  capacity: number;
  price: number;
}

interface EventManageTableProps {
  events: OrganizerEvent[];
}

export function EventManageTable({ events }: EventManageTableProps) {
  return (
    <div className="overflow-x-auto text-left">
      <Table>
        <TableHeader>
          <TableRow className="border-zinc-800 text-zinc-400 hover:bg-transparent">
            <TableHead className="pb-3 font-semibold text-zinc-400">Event Name</TableHead>
            <TableHead className="pb-3 font-semibold text-zinc-400">Status</TableHead>
            <TableHead className="pb-3 font-semibold text-zinc-400">Sales / Capacity</TableHead>
            <TableHead className="pb-3 font-semibold text-right text-zinc-400">Price</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((evt) => (
            <TableRow key={evt.id} className="text-zinc-300 border-zinc-800/50 hover:bg-zinc-900/10">
              <TableCell className="py-4 font-semibold text-white">{evt.name}</TableCell>
              <TableCell className="py-4">
                <Badge
                  variant={evt.status === 'active' ? 'default' : 'outline'}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                    evt.status === 'active'
                      ? 'border-green-500/20 bg-green-500/5 text-green-400'
                      : 'border-zinc-800 bg-zinc-900 text-zinc-500'
                  }`}
                >
                  {evt.status}
                </Badge>
              </TableCell>
              <TableCell className="py-4">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-white">{evt.sold}</span>
                  <span className="text-zinc-500">/ {evt.capacity}</span>
                  <div className="w-20 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-purple-500"
                      style={{ width: `${(evt.sold / evt.capacity) * 100}%` }}
                    />
                  </div>
                </div>
              </TableCell>
              <TableCell className="py-4 text-right font-bold text-cyan-400">
                {evt.price.toLocaleString('vi-VN')} ₫
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
