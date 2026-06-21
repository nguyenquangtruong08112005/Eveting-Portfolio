'use client';

import React from 'react';
import { Clock } from 'lucide-react';
import { Seat } from '@/types';

interface SeatGridProps {
  seats: Seat[];
  onSeatClick: (seat: Seat) => void;
  holdTimer: number | null;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

const SEAT_STYLES: Record<Seat['status'], string> = {
  available:
    'border-[var(--surface-border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:border-[var(--primary-dark)] hover:text-[var(--text-primary)] hover:bg-[var(--primary)]/10',
  held_by_you:
    'border-[var(--primary)] bg-[var(--primary)] text-[var(--on-primary)] shadow-lg shadow-[var(--primary)]/30 font-bold',
  held_by_others:
    'border-[var(--secondary-yellow)]/40 bg-[var(--secondary-yellow)]/15 text-[var(--secondary-yellow)] cursor-not-allowed',
  blocked:
    'border-[var(--error)]/20 bg-[var(--error)]/8 text-[var(--error)]/40 cursor-not-allowed',
};

export function SeatGrid({ seats, onSeatClick, holdTimer }: SeatGridProps) {
  return (
    <div className="flex flex-col aura-card p-6">
      <h2 className="text-xl font-bold text-[var(--text-primary)] mb-1">Chọn ghế ngồi</h2>
      <p className="text-[var(--text-muted)] text-xs mb-6">
        Nhấn vào ghế trống để giữ chỗ. Ghế được giữ trong 10 phút.
      </p>

      {/* Hold Timer — fixed height to prevent CLS */}
      <div className="h-10 mb-5 flex items-center">
        {holdTimer !== null && holdTimer > 0 ? (
          <div className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)]/10 border border-[var(--primary)]/30 rounded-xl text-[var(--primary-dark)] text-xs font-semibold w-fit">
            <Clock className="size-4" />
            <span>Hết hạn trong: {formatTime(holdTimer)}</span>
          </div>
        ) : (
          <span className="text-[var(--text-muted)] text-[11px] font-medium italic">
            Chọn ghế để bắt đầu đếm ngược
          </span>
        )}
      </div>

      {/* Stage */}
      <div className="w-full flex flex-col items-center mb-10">
        <div className="w-[75%] h-3.5 bg-gradient-to-r from-[var(--primary)] via-[var(--primary-dark)] to-[var(--primary)] rounded-full opacity-70" />
        <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-[0.2em] font-bold mt-2">
          SÂN KHẤU
        </span>
      </div>

      {/* Seat Grid */}
      <div className="flex justify-center overflow-x-auto pb-4">
        <div className="grid grid-cols-10 gap-2.5 min-w-[340px]">
          {seats.map((seat) => (
            <button
              key={seat.id}
              onClick={() => onSeatClick(seat)}
              disabled={seat.status === 'blocked' || seat.status === 'held_by_others'}
              className={`size-9 rounded-lg border text-[11px] font-semibold flex items-center justify-center transition-all btn-tactile ${SEAT_STYLES[seat.status]}`}
              title={`${seat.rowName}${seat.number} — ${seat.sectionName}`}
            >
              {seat.rowName}
              {seat.number}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-5 mt-6 pt-6 border-t border-[var(--surface-border)] text-xs">
        <div className="flex items-center gap-2">
          <div className="size-3.5 rounded bg-[var(--surface)] border border-[var(--surface-border)]" />
          <span className="text-[var(--text-muted)]">Trống</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="size-3.5 rounded bg-[var(--primary)] border border-[var(--primary)] shadow-sm" />
          <span className="text-[var(--text-secondary)] font-medium">Đã chọn</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="size-3.5 rounded bg-[var(--secondary-yellow)]/15 border border-[var(--secondary-yellow)]/40" />
          <span className="text-[var(--text-muted)]">Người khác giữ</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="size-3.5 rounded bg-[var(--error)]/8 border border-[var(--error)]/20" />
          <span className="text-[var(--text-muted)]">Đã bán</span>
        </div>
      </div>
    </div>
  );
}
