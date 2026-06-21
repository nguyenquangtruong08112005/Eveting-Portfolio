'use client';

import React from 'react';
import { CreditCard, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PaymentMethodsProps {
  paymentMethod: 'zalopay' | 'card' | 'atm';
  setPaymentMethod: (v: 'zalopay' | 'card' | 'atm') => void;
}

export function PaymentMethods({ paymentMethod, setPaymentMethod }: PaymentMethodsProps) {
  return (
    <div className="glass-card rounded-2xl p-6 bg-[#1E212B] border border-white/5 space-y-4">
      <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-white/5 pb-3">
        <CreditCard className="size-5 text-[var(--primary)]" />
        Phương Thức Thanh Toán
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
                <p className="text-xs font-bold text-white">Ví điện tử ZaloPay</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">Khuyên dùng, liên kết trực tiếp ứng dụng</p>
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
                <p className="text-xs font-bold text-white">Thẻ tín dụng quốc tế</p>
                <p className="text-[10px] text-zinc-500 mt-0.5 font-medium">Visa, Mastercard, JCB, Amex</p>
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
                <p className="text-xs font-bold text-white">Thẻ ATM nội địa</p>
                <p className="text-[10px] text-zinc-500 mt-0.5">Thanh toán qua cổng Napas với 40+ ngân hàng</p>
              </div>
            </div>
          </div>
        </label>
      </div>
    </div>
  );
}
