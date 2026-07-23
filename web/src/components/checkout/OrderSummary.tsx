'use client';

import { Ticket, Calendar, MapPin, Sparkles, ShieldCheck, AlertTriangle } from 'lucide-react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatPrice, formatDate } from '@/lib/constants';

interface OrderSummaryProps {
  event: import('@/types').Event | null;
  selectedSeats: string[];
  selectedTickets: { name: string; qty: number; price: number }[];
  subtotal: number;
  discount: number;
  total: number;
  voucherCode: string;
  setVoucherCode: (v: string) => void;
  voucherError: string;
  voucherSuccess: string;
  onApplyVoucher: () => void;
  processing: boolean;
  seatPrice: number;
}

export function OrderSummary({
  event,
  selectedSeats,
  selectedTickets,
  subtotal,
  discount,
  total,
  voucherCode,
  setVoucherCode,
  voucherError,
  voucherSuccess,
  onApplyVoucher,
  processing,
  seatPrice,
}: OrderSummaryProps) {
  const t = useTranslations('checkout');

  return (
    <div className="glass-card rounded-2xl p-6 space-y-6 lg:sticky lg:top-24">
      {/* Event Details */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2 border-b border-[var(--surface-border)] pb-3">
          <Ticket className="size-5 text-[var(--primary)]" />
          {t('order_summary')}
        </h3>

        {event && (
          <div className="flex gap-4 items-start p-3 bg-[var(--background)]/50 rounded-xl border border-[var(--surface-border)]">
            {event.imageUrl && (
              <div className="w-16 h-20 rounded-lg overflow-hidden shrink-0 border border-[var(--surface-border)] relative">
                <Image src={event.imageUrl} alt={event.name} fill className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-[var(--text-primary)] leading-snug line-clamp-2">
                {event.name}
              </h4>
              <div className="flex items-center gap-1.5 text-[var(--text-muted)] text-[10px] mt-2">
                <Calendar className="size-3 text-[var(--primary)] shrink-0" />
                <span className="truncate">{formatDate(event.date)}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[var(--text-muted)] text-[10px] mt-1">
                <MapPin className="size-3 text-[var(--primary)] shrink-0" />
                <span className="truncate">
                  {event.venueName || event.location?.address || event.city}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tickets list */}
      <div className="space-y-2.5">
        <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">
          {t('ticket_list')}
        </h4>
        <div className="space-y-2">
          {selectedSeats.length > 0 ? (
            <div className="flex justify-between items-center text-xs p-2 bg-[var(--background)]/50 rounded-lg border border-[var(--surface-border)]">
              <div>
                <p className="font-bold text-[var(--text-primary)]">{t('seating_ticket')}</p>
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">
                  {t('seat_numbers', { seats: selectedSeats.join(', ') })}
                </p>
              </div>
              <span className="font-bold text-[var(--text-secondary)]">
                {selectedSeats.length} x {formatPrice(seatPrice)}
              </span>
            </div>
          ) : (
            selectedTickets.map((ticket, idx) => (
              <div
                key={idx}
                className="flex justify-between items-center text-xs p-2 bg-[var(--background)]/50 rounded-lg border border-[var(--surface-border)]"
              >
                <div>
                  <p className="font-bold text-[var(--text-primary)]">
                    {t('ticket_type', { name: ticket.name })}
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{t('ticket_qty')}</p>
                </div>
                <span className="font-bold text-[var(--text-secondary)]">
                  {ticket.qty} x {formatPrice(ticket.price)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Voucher */}
      <div className="pt-2 border-t border-[var(--surface-border)] space-y-2">
        <h4 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">
          {t('voucher_section')}
        </h4>
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder={t('voucher_placeholder')}
            value={voucherCode}
            onChange={(e) => setVoucherCode(e.target.value)}
            disabled={processing}
            className="flex-1 uppercase font-bold tracking-wider rounded-xl text-xs py-5"
          />
          <Button
            type="button"
            onClick={onApplyVoucher}
            disabled={processing}
            className="bg-[var(--surface-hover)] hover:bg-[var(--surface-border)] text-[var(--text-primary)] font-bold text-xs px-4 py-5 rounded-xl transition-all cursor-pointer border border-[var(--surface-border)]"
          >
            {t('apply')}
          </Button>
        </div>

        {voucherError && (
          <p className="text-[10px] text-[var(--error)] font-bold mt-1 flex items-center gap-1">
            <AlertTriangle className="size-3" /> {voucherError}
          </p>
        )}
        {voucherSuccess && (
          <p className="text-[10px] text-[var(--success)] font-bold mt-1 flex items-center gap-1">
            <Sparkles className="size-3" /> {voucherSuccess}
          </p>
        )}
      </div>

      {/* Price breakdown */}
      <div className="border-t border-[var(--surface-border)] pt-4 space-y-2.5 text-xs">
        <div className="flex justify-between text-[var(--text-muted)]">
          <span>{t('subtotal')}</span>
          <span className="font-semibold text-[var(--text-primary)]">{formatPrice(subtotal)}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-[var(--success)] font-medium">
            <span>{t('discount')}</span>
            <span>-{formatPrice(discount)}</span>
          </div>
        )}
        <div className="flex justify-between text-[var(--text-muted)]">
          <span>{t('service_fee')}</span>
          <span className="text-[var(--success)] font-bold">{t('free')}</span>
        </div>

        <div className="border-t border-[var(--surface-border)] pt-3.5 flex justify-between items-end">
          <div>
            <span className="text-xs font-bold text-[var(--text-primary)] block mb-0.5">
              {t('total')}
            </span>
            <span className="text-[10px] text-[var(--text-muted)]">{t('vat_note')}</span>
          </div>
          <span className="text-xl font-black text-[var(--primary)]">{formatPrice(total)}</span>
        </div>
      </div>

      <Button
        type="submit"
        disabled={processing || subtotal === 0}
        className="w-full py-6 rounded-xl btn-primary-gradient text-sm tracking-wider font-bold uppercase flex items-center justify-center gap-2 cursor-pointer border-none btn-tactile text-[var(--on-primary)] disabled:opacity-50"
      >
        {processing ? t('processing') : t('pay_now')}
      </Button>

      <div className="flex items-center justify-center gap-1.5 text-[var(--text-muted)] text-[10px] pt-1">
        <ShieldCheck className="size-4 text-[var(--primary)]" />
        <span>{t('ssl_secure')}</span>
      </div>
    </div>
  );
}
