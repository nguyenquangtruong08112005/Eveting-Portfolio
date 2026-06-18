'use client';

import React from 'react';
import { Clock } from 'lucide-react';

interface Seat {
  id: string;
  rowName: string;
  number: number;
  status: 'available' | 'held_by_you' | 'held_by_others' | 'blocked';
  sectionName: string;
}

interface SeatGridProps {
  seats: Seat[];
  onSeatClick: (seat: Seat) => void;
  holdTimer: number | null;
}

export function SeatGrid({ seats, onSeatClick, holdTimer }: SeatGridProps) {
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col premium-card p-8 rounded-2xl">
      <h2 className="text-2xl font-bold text-white mb-2">Select Seats</h2>
      <p className="text-zinc-400 text-xs mb-8">
        Click on available seats to hold them for checkout. Holds expire in 10 minutes.
      </p>
      <div className="h-10 mb-6 flex items-center">
        {holdTimer !== null && holdTimer > 0 ? (
          <div className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/30 rounded-xl text-purple-300 text-xs font-semibold w-fit">
            <Clock className="size-4" />
            <span>Hold expires in: {formatTime(holdTimer)}</span>
          </div>
        ) : (
          <span className="text-zinc-500 text-[11px] font-medium italic">Select a seat to start hold timer</span>
        )}
      </div>

      {/* Stage Visual */}
      <div className="w-full flex flex-col items-center mb-12">
        <div className="w-[80%] h-4 bg-gradient-to-r from-purple-500 via-cyan-400 to-purple-500 rounded-full blur-[1px] opacity-80" />
        <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mt-2">STAGE</span>
      </div>

      {/* Seat Grid */}
      <div className="flex justify-center overflow-x-auto pb-4">
        <div className="grid grid-cols-10 gap-3 min-w-[340px]">
          {seats.map((seat) => {
            let statusClass =
              'border-zinc-800 bg-zinc-900/60 text-zinc-400 hover:border-purple-500 hover:text-white';
            if (seat.status === 'held_by_you') {
              statusClass =
                'border-purple-500 bg-purple-600 text-white shadow-lg shadow-purple-500/35 glow-text';
            } else if (seat.status === 'held_by_others') {
              statusClass =
                'border-orange-500/50 bg-orange-600/40 text-orange-200 cursor-not-allowed';
            } else if (seat.status === 'blocked') {
              statusClass = 'border-red-950 bg-red-950/40 text-red-700 cursor-not-allowed';
            }

            return (
              <button
                key={seat.id}
                onClick={() => onSeatClick(seat)}
                className={`size-10 rounded-xl border text-xs font-semibold flex items-center justify-center transition-all cursor-pointer btn-tactile ${statusClass}`}
              >
                {seat.rowName}
                {seat.number}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legends */}
      <div className="flex flex-wrap items-center justify-center gap-6 mt-8 pt-8 border-t border-zinc-800/85 text-xs">
        <div className="flex items-center gap-2">
          <div className="size-4 rounded bg-zinc-900 border border-zinc-850" />
          <span className="text-zinc-400">Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="size-4 rounded bg-purple-600 border border-purple-500 shadow-md shadow-purple-500/35" />
          <span className="text-zinc-300 font-medium">Selected / Held By You</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="size-4 rounded bg-orange-600/40 border border-orange-500/50" />
          <span className="text-zinc-400">Held By Others</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="size-4 rounded bg-red-950/40 border border-red-950" />
          <span className="text-zinc-500">Sold / Reserved</span>
        </div>
      </div>
    </div>
  );
}
