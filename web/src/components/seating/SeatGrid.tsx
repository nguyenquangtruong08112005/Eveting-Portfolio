'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import type { Seat, SeatAvailabilityStatus } from '@/types/seat';

interface SeatGridProps {
  seats: Seat[];
  selectedSeatIds?: readonly string[];
  onSeatClick?: (seat: Seat) => void;
  disabled?: boolean;
}

const STATUS_STYLES: Record<SeatAvailabilityStatus, string> = {
  AVAILABLE:
    'border-[var(--surface-border)] bg-[var(--surface)] text-[var(--text-secondary)] hover:border-[var(--primary-dark)] hover:bg-[var(--primary)]/10 hover:text-[var(--text-primary)]',
  HELD:
    'border-[var(--warning)]/40 bg-[var(--warning)]/15 text-[var(--warning)] cursor-not-allowed',
  SOLD: 'border-[var(--error)]/25 bg-[var(--error)]/10 text-[var(--error)]/60 cursor-not-allowed',
  BLOCKED:
    'border-[var(--text-muted)]/25 bg-[var(--surface-hover)] text-[var(--text-muted)]/60 cursor-not-allowed',
};

export function SeatGrid({
  seats,
  selectedSeatIds = [],
  onSeatClick,
  disabled = false,
}: SeatGridProps) {
  const t = useTranslations('seat_grid');
  const selected = useMemo(() => new Set(selectedSeatIds), [selectedSeatIds]);
  const sections = useMemo(() => {
    const grouped = new Map<string, { name: string; rows: Map<string, Seat[]> }>();
    for (const seat of seats) {
      const sectionKey = seat.sectionId || seat.sectionName;
      const section = grouped.get(sectionKey) || {
        name: seat.sectionName,
        rows: new Map<string, Seat[]>(),
      };
      const row = section.rows.get(seat.rowLabel) || [];
      row.push(seat);
      section.rows.set(seat.rowLabel, row);
      grouped.set(sectionKey, section);
    }
    return [...grouped.entries()].map(([id, section]) => ({
      id,
      name: section.name,
      rows: [...section.rows.entries()].map(([label, rowSeats]) => ({
        label,
        seats: rowSeats.toSorted((a, b) => a.column - b.column),
      })),
    }));
  }, [seats]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-bold text-[var(--text-primary)]">{t('title')}</h2>
        <span className="text-xs font-semibold text-[var(--text-muted)]">
          {t('selected_count', { count: selected.size })}
        </span>
      </div>

      <div className="flex flex-col items-center">
        <div className="h-2.5 w-3/4 max-w-md rounded-full bg-[var(--primary)] opacity-70" />
        <span className="mt-2 text-[10px] font-bold uppercase text-[var(--text-muted)]">
          {t('stage')}
        </span>
      </div>

      {sections.length === 0 ? (
        <div className="py-10 text-center text-sm text-[var(--text-muted)]">{t('empty')}</div>
      ) : (
        <div className="space-y-7 overflow-x-auto pb-3">
          {sections.map((section) => (
            <section key={section.id} aria-label={section.name} className="min-w-max">
              <h3 className="mb-3 text-center text-xs font-bold text-[var(--text-secondary)]">
                {section.name}
              </h3>
              <div className="space-y-2">
                {section.rows.map((row) => (
                  <div key={row.label} className="flex items-center justify-center gap-2">
                    <span className="w-7 shrink-0 text-right text-[10px] font-bold text-[var(--text-muted)]">
                      {row.label}
                    </span>
                    <div
                      className="grid gap-2"
                      style={{
                        gridTemplateColumns: `repeat(${row.seats.length}, minmax(2.25rem, 2.25rem))`,
                      }}
                    >
                      {row.seats.map((seat) => {
                        const isSelected = selected.has(seat.id);
                        const isHeldByCurrentUser =
                          seat.status === 'HELD' && seat.heldByCurrentUser;
                        const canSelect = seat.status === 'AVAILABLE' && !disabled;
                        return (
                          <button
                            key={seat.id}
                            type="button"
                            onClick={() => onSeatClick?.(seat)}
                            disabled={disabled || (!canSelect && !isSelected)}
                            aria-pressed={isSelected}
                            aria-label={`${seat.sectionName}, ${seat.label}, ${t(
                              isSelected || isHeldByCurrentUser
                                ? 'selected'
                                : seat.status.toLowerCase()
                            )}`}
                            title={`${seat.sectionName} - ${seat.label}`}
                            className={`flex size-9 items-center justify-center rounded-md border text-[10px] font-semibold transition-colors ${
                              isSelected || isHeldByCurrentUser
                                ? 'border-[var(--primary)] bg-[var(--primary)] text-[var(--on-primary)] shadow-sm'
                                : STATUS_STYLES[seat.status]
                            }`}
                          >
                            <span className="max-w-8 truncate px-0.5">{seat.label}</span>
                          </button>
                        );
                      })}
                    </div>
                    <span className="w-7 shrink-0 text-left text-[10px] font-bold text-[var(--text-muted)]">
                      {row.label}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-4 border-t border-[var(--surface-border)] pt-4 text-[10px] text-[var(--text-muted)]">
        {(['AVAILABLE', 'HELD', 'SOLD', 'BLOCKED'] as const).map((status) => (
          <span key={status} className="inline-flex items-center gap-1.5">
            <span className={`size-3 rounded border ${STATUS_STYLES[status]}`} />
            {t(status.toLowerCase())}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded border border-[var(--primary)] bg-[var(--primary)]" />
          {t('selected')}
        </span>
      </div>
    </div>
  );
}
