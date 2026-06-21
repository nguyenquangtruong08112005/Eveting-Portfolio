'use client';

import { Minus, Plus, Ticket, ShoppingCart } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/constants';
import type { TicketType } from '@/types';

export type { TicketType };

interface TicketTypePickerProps {
  ticketTypes: TicketType[];
  quantities: Record<string, number>;
  onQuantityChange: (key: string, qty: number) => void;
  onCheckout: () => void;
  disabled?: boolean;
  maxPerType?: number;
}

const TICKET_TYPE_LABELS: Record<string, string> = {
  GA: 'General Admission',
  VIP: 'VIP',
  VVIP: 'VVIP',
  Standard: 'Standard',
  EarlyBird: 'Early Bird',
  Entrance: 'Entrance',
  Visitor: 'Visitor',
  Exhibitor: 'Exhibitor',
  FreeEntrance: 'Free',
  Free: 'Free',
  AllInclusive: 'All Inclusive',
  Adult: 'Adult',
  Child: 'Child',
  FrontRow: 'Front Row',
  ZoneA: 'Zone A',
  ZoneB: 'Zone B',
  Runner: 'Runner',
};

function getTicketLabel(key: string): string {
  return TICKET_TYPE_LABELS[key] || key;
}

export function TicketTypePicker({
  ticketTypes,
  quantities,
  onQuantityChange,
  onCheckout,
  disabled = false,
  maxPerType = 10,
}: TicketTypePickerProps) {
  const t = useTranslations('ticket_picker');
  const totalItems = Object.values(quantities).reduce((sum, q) => sum + q, 0);
  const totalPrice = ticketTypes.reduce(
    (sum, t) => sum + t.price * (quantities[t.key] || 0),
    0
  );

  return (
    <div className="glass-card rounded-xl bg-[#18181A]/70 border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-white/10">
        <div className="flex items-center gap-2 mb-1">
          <Ticket className="size-4 text-[var(--primary)]" />
          <h3 className="text-base font-bold text-[var(--text-primary)]">{t('title')}</h3>
        </div>
        <p className="text-xs text-zinc-400">
          {t('subtitle')}
        </p>
      </div>

      {/* Ticket list */}
      <div className="divide-y divide-white/10">
        {ticketTypes.map((ticket) => {
          const qty = quantities[ticket.key] || 0;
          const isFree = ticket.price === 0;
          const isSoldOut = ticket.available === 0;

          return (
            <div
              key={ticket.key}
              className={`p-5 transition-colors ${
                qty > 0 ? 'bg-[var(--primary)]/10' : ''
              } ${isSoldOut ? 'opacity-50' : ''}`}
            >
              <div className="flex items-start justify-between gap-4">
                {/* Ticket info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--text-primary)]">
                    {getTicketLabel(ticket.key)}
                  </p>
                  <p
                    className={`text-lg font-bold mt-0.5 ${
                      isFree ? 'text-[var(--primary)]' : 'text-[var(--primary)]'
                    }`}
                  >
                    {isFree ? formatPrice(0) : formatPrice(ticket.price)}
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    {isSoldOut ? (
                      <span className="text-[var(--error)] font-semibold">{t('sold_out')}</span>
                    ) : (
                      ticket.available === 999 ? t('on_sale') : t('remaining', { n: ticket.available.toLocaleString() })
                    )}
                  </p>
                </div>

                {/* Quantity selector */}
                {!isSoldOut && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => onQuantityChange(ticket.key, Math.max(0, qty - 1))}
                      disabled={qty === 0 || disabled}
                      className="size-8 rounded-lg border border-white/10 flex items-center justify-center text-[var(--text-secondary)] hover:bg-[#201f1f] transition-colors disabled:opacity-30 cursor-pointer"
                    >
                      <Minus className="size-3.5" />
                    </button>
                    <span className="w-8 text-center text-sm font-bold text-[var(--text-primary)]">
                      {qty}
                    </span>
                    <button
                      onClick={() =>
                        onQuantityChange(
                          ticket.key,
                          Math.min(maxPerType, ticket.available, qty + 1)
                        )
                      }
                      disabled={qty >= Math.min(maxPerType, ticket.available) || disabled}
                      className="size-8 rounded-lg border border-white/10 flex items-center justify-center text-[var(--text-secondary)] hover:bg-[#201f1f] transition-colors disabled:opacity-30 cursor-pointer"
                    >
                      <Plus className="size-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary + Checkout */}
      <div className="p-5 border-t border-white/10 bg-black/20">
        {totalItems > 0 && (
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-[var(--text-secondary)]">
              {totalItems} {t('ticket_counter')}
            </span>
            <span className="text-xl font-extrabold text-[var(--text-primary)]">
              {formatPrice(totalPrice)}
            </span>
          </div>
        )}
        <Button
          onClick={onCheckout}
          disabled={totalItems === 0 || disabled}
          className="w-full py-6 rounded-xl btn-primary-gradient text-sm tracking-wide flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 border-none btn-tactile font-bold text-[#00210f]"
        >
          <ShoppingCart className="size-4" />
          {totalItems === 0 ? t('select_to_continue') : t('buy_summary', { count: totalItems, price: formatPrice(totalPrice) })}
        </Button>
      </div>
    </div>
  );
}
