'use client';

import { CreditCard, Wallet, Zap } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

interface PaymentMethodsProps {
  paymentMethod: 'zalopay' | 'card' | 'atm';
  setPaymentMethod: (v: 'zalopay' | 'card' | 'atm') => void;
}

export function PaymentMethods({ paymentMethod, setPaymentMethod }: PaymentMethodsProps) {
  const t = useTranslations('checkout');

  const optionClass = (active: boolean) =>
    cn(
      'flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all',
      active
        ? 'border-[var(--primary)] bg-[var(--primary)]/5'
        : 'border-[var(--surface-border)] bg-[var(--background)]/50 hover:border-[var(--text-muted)]'
    );

  return (
    <div className="glass-card rounded-2xl p-6 space-y-4">
      <h3 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2 border-b border-[var(--surface-border)] pb-3">
        <CreditCard className="size-5 text-[var(--primary)]" />
        {t('payment_title')}
      </h3>

      <div className="space-y-3">
        {/* ZaloPay */}
        <label className={optionClass(paymentMethod === 'zalopay')}>
          <div className="flex items-center gap-3">
            <input
              type="radio"
              name="payment"
              checked={paymentMethod === 'zalopay'}
              onChange={() => setPaymentMethod('zalopay')}
              className="accent-[var(--primary)] size-4"
            />
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-[#1877F2] flex items-center justify-center font-bold text-white text-xs select-none">
                ZP
              </div>
              <div>
                <p className="text-xs font-bold text-[var(--text-primary)]">{t('zalopay')}</p>
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{t('zalopay_hint')}</p>
              </div>
            </div>
          </div>
          <span className="text-[10px] font-bold text-[var(--success)] bg-[var(--success)]/10 px-2 py-0.5 rounded uppercase tracking-wider flex items-center gap-1">
            <Zap className="size-2.5" />
            {t('fast_badge')}
          </span>
        </label>

        {/* Credit Card */}
        <label className={optionClass(paymentMethod === 'card')}>
          <div className="flex items-center gap-3">
            <input
              type="radio"
              name="payment"
              checked={paymentMethod === 'card'}
              onChange={() => setPaymentMethod('card')}
              className="accent-[var(--primary)] size-4"
            />
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-[var(--surface-hover)] flex items-center justify-center border border-[var(--surface-border)]">
                <CreditCard className="size-4.5 text-[var(--text-secondary)]" />
              </div>
              <div>
                <p className="text-xs font-bold text-[var(--text-primary)]">{t('credit_card')}</p>
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5 font-medium">
                  {t('credit_card_hint')}
                </p>
              </div>
            </div>
          </div>
        </label>

        {/* ATM Card */}
        <label className={optionClass(paymentMethod === 'atm')}>
          <div className="flex items-center gap-3">
            <input
              type="radio"
              name="payment"
              checked={paymentMethod === 'atm'}
              onChange={() => setPaymentMethod('atm')}
              className="accent-[var(--primary)] size-4"
            />
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-[var(--surface-hover)] flex items-center justify-center border border-[var(--surface-border)]">
                <Wallet className="size-4.5 text-[var(--text-secondary)]" />
              </div>
              <div>
                <p className="text-xs font-bold text-[var(--text-primary)]">{t('atm_card')}</p>
                <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{t('atm_hint')}</p>
              </div>
            </div>
          </div>
        </label>
      </div>
    </div>
  );
}
