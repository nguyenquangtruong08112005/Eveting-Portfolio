'use client';

import React from 'react';
import { Calendar, MapPin, CreditCard, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatPrice, formatDate } from '@/lib/constants';

interface BookingDetailsProps {
  eventName: string;
  eventDate: number;
  venueName?: string;
  address?: string;
  city?: string;
  selectedSeats: string[];
  minPrice: number;
  onCheckout: () => void;
  disabled?: boolean;
}

export function BookingDetails({
  eventName,
  eventDate,
  venueName,
  address,
  city,
  selectedSeats,
  minPrice,
  onCheckout,
  disabled,
}: BookingDetailsProps) {
  const totalPrice = selectedSeats.length * minPrice;
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="aura-card p-5 flex flex-col gap-5 sticky top-24">
      <h3 className="text-lg font-bold text-[var(--text-primary)]">{eventName}</h3>

      {/* Event Info */}
      <div className="flex flex-col gap-2 text-xs text-[var(--text-secondary)]">
        <div className="flex items-center gap-2">
          <Calendar className="size-3.5 text-[var(--primary-dark)]" />
          <span>{mounted ? formatDate(eventDate) : '...'}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="size-3.5 text-[var(--secondary-blue)]" />
          <span>{venueName || address}{city ? `, ${city}` : ''}</span>
        </div>
      </div>

      {/* Selected Seats Summary */}
      <div className="border-t border-[var(--surface-border)] pt-4">
        <p className="text-xs text-[var(--text-muted)] uppercase font-semibold tracking-wider mb-2">
          Ghế đã chọn
        </p>
        {selectedSeats.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)] italic">Chưa chọn ghế nào</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {selectedSeats.map((seatId) => (
              <span
                key={seatId}
                className="px-2.5 py-1 rounded-lg bg-[var(--primary)]/10 border border-[var(--primary)]/20 text-[10px] font-bold text-[var(--primary-dark)] uppercase"
              >
                {seatId.replace('seat_', '')}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Price Breakdown */}
      <div className="border-t border-[var(--surface-border)] pt-4 space-y-2">
        <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
          <span>Đơn giá</span>
          <span>{formatPrice(minPrice)}</span>
        </div>
        <div className="flex items-center justify-between text-xs text-[var(--text-secondary)]">
          <span>Số lượng</span>
          <span>× {selectedSeats.length}</span>
        </div>
        <div className="flex items-center justify-between text-base font-bold text-[var(--text-primary)] pt-2 border-t border-[var(--surface-border)]">
          <span>Tổng cộng</span>
          <span className="text-[var(--primary-dark)]">{formatPrice(totalPrice)}</span>
        </div>
      </div>

      {/* Checkout CTA */}
      <Button
        onClick={onCheckout}
        disabled={disabled || selectedSeats.length === 0}
        className="w-full py-6 rounded-xl btn-primary-gradient text-sm tracking-wide flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 border-none btn-tactile font-bold"
      >
        <CreditCard className="size-4" />
        Thanh toán qua ZaloPay
        <ArrowRight className="size-4" />
      </Button>
    </div>
  );
}
