'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Clock, Loader2, RefreshCw, ShieldCheck, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { SeatGrid } from './SeatGrid';
import { SeatService, isSeatReservationConflict } from '@/services/seat.service';
import {
  MAX_SEATS_PER_HOLD,
  type Seat,
  type SeatHold,
} from '@/types/seat';

interface SeatSelectionPanelProps {
  eventId: string;
  performanceId?: string;
  disabled?: boolean;
  onHoldChange: (seats: Seat[], hold: SeatHold | null) => void;
}

function secondsUntil(value: string): number {
  return Math.max(0, Math.ceil((Date.parse(value) - Date.now()) / 1000));
}

function formatCountdown(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

export function SeatSelectionPanel({
  eventId,
  performanceId,
  disabled = false,
  onHoldChange,
}: SeatSelectionPanelProps) {
  const t = useTranslations('seat_grid');
  const [seats, setSeats] = useState<Seat[]>([]);
  const [resolvedPerformanceId, setResolvedPerformanceId] = useState(performanceId || '');
  const [draftSeatIds, setDraftSeatIds] = useState<string[]>([]);
  const [hold, setHold] = useState<SeatHold | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const holdIntentKey = useRef<string | null>(null);
  const onHoldChangeRef = useRef(onHoldChange);

  useEffect(() => {
    onHoldChangeRef.current = onHoldChange;
  }, [onHoldChange]);

  const loadAvailability = useCallback(
    async (showSpinner = true) => {
      if (showSpinner) setLoading(true);
      setError(null);
      try {
        const response = await SeatService.getAvailability(eventId, performanceId);
        setResolvedPerformanceId(response.performanceId);
        setSeats(response.seats);
        setDraftSeatIds([]);
        if (response.currentHold && secondsUntil(response.currentHold.expiresAt) > 0) {
          const heldSeats = response.seats.filter((seat) =>
            response.currentHold?.seatIds.includes(seat.id)
          );
          setHold(response.currentHold);
          setRemainingSeconds(secondsUntil(response.currentHold.expiresAt));
          onHoldChangeRef.current(heldSeats, response.currentHold);
        } else {
          setHold(null);
          setRemainingSeconds(0);
          onHoldChangeRef.current([], null);
        }
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : t('load_error');
        setError(message);
        setSeats([]);
        onHoldChangeRef.current([], null);
      } finally {
        if (showSpinner) setLoading(false);
      }
    },
    [eventId, performanceId, t]
  );

  useEffect(() => {
    void loadAvailability();
  }, [loadAvailability]);

  useEffect(() => {
    if (!hold) return;
    const update = () => {
      const next = secondsUntil(hold.expiresAt);
      setRemainingSeconds(next);
      if (next === 0) {
        setHold(null);
        onHoldChangeRef.current([], null);
        toast.error(t('hold_expired'));
        void loadAvailability(false);
      }
    };
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [hold, loadAvailability, t]);

  const heldSeatIds = hold?.seatIds ?? [];
  const selectedSeatIds = hold ? heldSeatIds : draftSeatIds;
  const selectedSeats = useMemo(() => {
    const selected = new Set(selectedSeatIds);
    return seats.filter((seat) => selected.has(seat.id));
  }, [seats, selectedSeatIds]);

  const handleSeatClick = (seat: Seat) => {
    if (hold || disabled || seat.status !== 'AVAILABLE') return;
    setError(null);
    setDraftSeatIds((current) => {
      if (current.includes(seat.id)) return current.filter((id) => id !== seat.id);
      if (current.length >= MAX_SEATS_PER_HOLD) {
        toast.error(t('selection_limit', { count: MAX_SEATS_PER_HOLD }));
        return current;
      }
      return [...current, seat.id];
    });
  };

  const handleHold = async () => {
    if (
      !resolvedPerformanceId ||
      draftSeatIds.length === 0 ||
      draftSeatIds.length > MAX_SEATS_PER_HOLD
    ) {
      return;
    }
    setMutating(true);
    setError(null);
    holdIntentKey.current ||= crypto.randomUUID();
    try {
      const nextHold = await SeatService.holdSeats(
        eventId,
        { performanceId: resolvedPerformanceId, seatIds: draftSeatIds },
        holdIntentKey.current
      );
      const selected = new Set(nextHold.seatIds);
      const heldSeats = seats
        .filter((seat) => selected.has(seat.id))
        .map((seat) => ({
          ...seat,
          status: 'HELD' as const,
          heldByCurrentUser: true,
          holdExpiresAt: nextHold.expiresAt,
        }));
      setSeats((current) =>
        current.map((seat) =>
          selected.has(seat.id)
            ? {
                ...seat,
                status: 'HELD',
                heldByCurrentUser: true,
                holdExpiresAt: nextHold.expiresAt,
              }
            : seat
        )
      );
      setDraftSeatIds([]);
      setHold(nextHold);
      setRemainingSeconds(secondsUntil(nextHold.expiresAt));
      onHoldChangeRef.current(heldSeats, nextHold);
      holdIntentKey.current = null;
      toast.success(t('hold_success'));
    } catch (holdError) {
      holdIntentKey.current = null;
      if (isSeatReservationConflict(holdError)) {
        await loadAvailability(false);
        setError(t('seat_conflict'));
        toast.error(t('seat_conflict'));
      } else {
        setError(holdError instanceof Error ? holdError.message : t('hold_error'));
      }
    } finally {
      setMutating(false);
    }
  };

  const handleRelease = async () => {
    if (!hold) return;
    setMutating(true);
    setError(null);
    try {
      await SeatService.releaseHold(eventId, {
        performanceId: resolvedPerformanceId,
        holdToken: hold.holdToken,
        seatIds: hold.seatIds,
      });
      setHold(null);
      setRemainingSeconds(0);
      onHoldChangeRef.current([], null);
      await loadAvailability(false);
    } catch (releaseError) {
      setError(releaseError instanceof Error ? releaseError.message : t('release_error'));
    } finally {
      setMutating(false);
    }
  };

  return (
    <div className="aura-card flex flex-col gap-5 p-5">
      <div className="flex min-h-9 flex-wrap items-center justify-between gap-3">
        {hold ? (
          <div className="inline-flex items-center gap-2 text-xs font-bold text-[var(--primary)]">
            <Clock className="size-4" />
            <span>{t('expires_in')}</span>
            <span className="font-mono text-sm tabular-nums">
              {formatCountdown(remainingSeconds)}
            </span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <ShieldCheck className="size-4 text-[var(--success)]" />
            {t('hold_duration')}
          </div>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => void loadAvailability(false)}
          disabled={loading || mutating}
          title={t('refresh')}
          aria-label={t('refresh')}
        >
          <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-md border border-[var(--error)]/30 bg-[var(--error)]/10 px-3 py-2 text-xs text-[var(--error)]"
        >
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="flex min-h-64 items-center justify-center">
          <Loader2 className="size-7 animate-spin text-[var(--primary)]" />
        </div>
      ) : (
        <SeatGrid
          seats={seats}
          selectedSeatIds={selectedSeatIds}
          onSeatClick={handleSeatClick}
          disabled={disabled || Boolean(hold) || mutating}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--surface-border)] pt-4">
        <span className="text-xs font-semibold text-[var(--text-secondary)]">
          {t('selected_count', { count: selectedSeats.length })}
        </span>
        {hold ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleRelease()}
            disabled={mutating}
            className="gap-2"
          >
            {mutating ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
            {t('release_hold')}
          </Button>
        ) : (
          <Button
            type="button"
            onClick={() => void handleHold()}
            disabled={disabled || mutating || draftSeatIds.length === 0}
            className="gap-2 btn-primary-gradient text-[var(--on-primary)]"
          >
            {mutating ? <Loader2 className="size-4 animate-spin" /> : <Clock className="size-4" />}
            {t('hold_selected', { count: draftSeatIds.length })}
          </Button>
        )}
      </div>
    </div>
  );
}
