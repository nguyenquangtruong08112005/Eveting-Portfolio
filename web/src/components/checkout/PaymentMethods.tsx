'use client';

import { CreditCard, Wallet } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

interface PaymentMethodsProps {
  paymentMethod: 'zalopay' | 'card' | 'atm';
  setPaymentMethod: (v: 'zalopay' | 'card' | 'atm') => void;
}

export function PaymentMethods({ paymentMethod, setPaymentMethod }: PaymentMethodsProps) {
  const t = useTranslations('checkout');

  return (
    <div className="glass-card rounded-2xl p-6 bg-[#1E212B] border border-white/5 space-y-4">
      <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-white/5 pb-3">
        <CreditCard className="size-5 text-[var(--primary)]" />
        {t('payment_title')}
      </h3>

      <div className="space-y-3">
        {/* ZaloPay */}
        <label
          className={cn(
            "flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all",
            paymentMethod === 'zalopay'
              ? "border-[var(--primary)] bg-[var(--primary)]/5"
              : "border-white/5 bg-[#131313]/30 hover:border-white/10"
          )}
        >
          <div className="flex items-center gap-3">
            <input
              type="radio"
              name="payment"
              checked={paymentMethod === 'zalopay'}
              onChange={() => setPaymentMethod('zalopay')}
              className="accent-[var(--primary)] size-4"
            />
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-white text-xs select-none">
                ZP
              </div>
              <div>
                <p className="text-xs font-bold text-white">{t('zalopay')}</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">{t('zalopay_hint')}</p>
              </div>
            </div>
          </div>
          <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded uppercase tracking-wider">Fast</span>
        </label>

        {/* Credit Card */}
        <label
          className={cn(
            "flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all",
            paymentMethod === 'card'
              ? "border-[var(--primary)] bg-[var(--primary)]/5"
              : "border-white/5 bg-[#131313]/30 hover:border-white/10"
          )}
        >
          <div className="flex items-center gap-3">
            <input
              type="radio"
              name="payment"
              checked={paymentMethod === 'card'}
              onChange={() => setPaymentMethod('card')}
              className="accent-[var(--primary)] size-4"
            />
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-zinc-800 flex items-center justify-center border border-white/10">
                <CreditCard className="size-4.5 text-zinc-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">{t('credit_card')}</p>
                <p className="text-[10px] text-zinc-500 mt-0.5 font-medium">{t('credit_card_hint')}</p>
              </div>
            </div>
          </div>
        </label>

        {/* ATM Card */}
        <label
          className={cn(
            "flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all",
            paymentMethod === 'atm'
              ? "border-[var(--primary)] bg-[var(--primary)]/5"
              : "border-white/5 bg-[#131313]/30 hover:border-white/10"
          )}
        >
          <div className="flex items-center gap-3">
            <input
              type="radio"
              name="payment"
              checked={paymentMethod === 'atm'}
              onChange={() => setPaymentMethod('atm')}
              className="accent-[var(--primary)] size-4"
            />
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-zinc-800 flex items-center justify-center border border-white/10">
                <Wallet className="size-4.5 text-zinc-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">{t('atm_card')}</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">{t('atm_hint')}</p>
              </div>
            </div>
          </div>
        </label>
      </div>
    </div>
  );
}
